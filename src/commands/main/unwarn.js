const warnings = require('./warn').warnings;

module.exports = {
  name: 'unwarn',
  description: 'Hapus peringatan dari anggota (khusus admin)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Perintah ini hanya dapat digunakan di dalam grup.' }, { quoted: msg });
    }
    if (!msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Tag pengguna yang ingin anda unwarn.' }, { quoted: msg });
    }
    const target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    if (warnings[target]) {
      warnings[target]--;
      await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Peringatan @${target.split('@')[0]}' berhasil dihapus (${warnings[target]}) ✅`, mentions: [target] }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ @${target.split('@')[0]} bersih dari peringatan.`, mentions: [target] }, { quoted: msg });
    }
  },
}; 

// [berhasil] unwarn (mengurangi point warning) ✓
