const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'setsubject',
  description: 'Ubah nama grup (khusus admin)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Perintah ini hanya dapat digunakan di dalam grup.' }, { quoted: msg });
    }
    if (!args.length) return sock.sendMessage(msg.key.remoteJid, { text: `*Contoh* : ${commandPrefix}setsubject grup virtual` }, { quoted: msg });
    const subject = args.join(' ');
    try {
      await sock.groupUpdateSubject(msg.key.remoteJid, subject);
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ Nama grup berhasil diperbarui.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat memperbarui nama grup: ' + e.message }, { quoted: msg });
    }
  },
}; 

// [berhasil] fitur ganti nama group ✓