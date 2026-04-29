const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../afk.json');

const formatDuration = (timestamp) => {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours} jam ${minutes % 60} menit`;
  if (minutes > 0) return `${minutes} menit ${seconds % 60} detik`;
  return `${seconds} detik`;
};

const afkHandler = async (sock, msg) => {
  try {
    if (!fs.existsSync(dbPath)) return false;
    const db = JSON.parse(fs.readFileSync(dbPath));
    const sender = msg.key.participant || msg.key.remoteJid;
    const remoteJid = msg.key.remoteJid;

    // 1. Check if the sender is currently AFK
    if (db[sender]) {
      const { time } = db[sender];
      delete db[sender];
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      await sock.sendMessage(remoteJid, { 
        text: `Selamat datang kembali! Kamu berhenti AFK.\nDurasi: *${formatDuration(time)}*`
      }, { quoted: msg });
      
      return true; // Stop execution to prevent further commands
    }

    // 2. Check if anyone mentions or replies to an AFK user
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const targetJids = [...new Set([...mentionedJids, ...(quotedJid ? [quotedJid] : [])])];

    for (const jid of targetJids) {
      if (db[jid]) {
        const { reason, time } = db[jid];
        await sock.sendMessage(remoteJid, { 
          text: `Ssttt! @${jid.split('@')[0]} sedang AFK.\n*Alasan:* ${reason}\n*Sejak:* ${formatDuration(time)} lalu`,
          mentions: [jid]
        }, { quoted: msg });
        return true; 
      }
    }

    return false;
  } catch (error) {
    console.error('AFK Handler Error:', error);
    return false;
  }
};

module.exports = { afkHandler };
