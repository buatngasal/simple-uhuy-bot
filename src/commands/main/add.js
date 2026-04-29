const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'add',
  description: 'Masukkan anggota ke grup (khusus admin)',
  usage: `${commandPrefix}add 6282123456789`,
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Hanya bisa digunakan di grup.' }, { quoted: msg });
    }
    if (!args[0]) return sock.sendMessage(msg.key.remoteJid, { text: `*Contoh* : ${commandPrefix}add 6282123456789` }, { quoted: msg });
    const number = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    try {      
      await sock.groupParticipantsUpdate(msg.key.remoteJid, [number], "add");
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `✅ Anggota @${args[0].replace(/[^0-9]/g, '')} berhasil ditambahkan ke grup.`, 
        mentions: [number] 
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat menambahkan anggota: ' + e.message }, { quoted: msg });
    }
  },
};

// [berhasil] fitur add member ✓
