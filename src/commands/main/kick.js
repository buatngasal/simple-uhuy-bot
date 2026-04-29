const { isAdmin } = require('./utils');

module.exports = {
  name: 'kick',
  description: 'Mengeluarkan anggota dari grup (khusus admin)',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.participant;
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '⚠️ Hanya bisa digunakan di grup.' }, { quoted: msg });
    }
    if (!(await isAdmin(sock, jid, sender))) {
      return sock.sendMessage(jid, { text: '⚠️ Perintah ini hanya tersedia bagi admin grup.' }, { quoted: msg });
    }
    // Support both reply and mention
    let target = args[0];
    if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (msg.message.extendedTextMessage?.contextInfo?.participant) {
      target = msg.message.extendedTextMessage.contextInfo.participant;
    }
    if (!target) {
      return sock.sendMessage(jid, { text: `*Contoh* : ${commandPrefix}kick @member` }, { quoted: msg });
    }
    try {
      await sock.groupParticipantsUpdate(jid, [target], 'remove');
      await sock.sendMessage(jid, { text: `✅ Anggota @${target.split('@')[0]} berhasil dikeluarkan dari grup.`, mentions: [target] }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: '❌ Terjadi kesalahan saat mengeluarkan anggota.' }, { quoted: msg });
    }
  },
};

// [berhasil] fitur kick member ✓