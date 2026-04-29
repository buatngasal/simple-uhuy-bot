const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'setdesc',
  description: 'Atur deskripsi grup (jika bot adalah admin)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Perintah ini hanya dapat digunakan di dalam grup.' }, { quoted: msg });
    }
    if (!args.length) return sock.sendMessage(msg.key.remoteJid, { text: `*Contoh* : ${commandPrefix}setdesc grup ini milik saya` }, { quoted: msg });
    const desc = args.join(' ');
    try {
      await sock.groupUpdateDescription(msg.key.remoteJid, desc);
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ Deskripsi grup berhasil diperbarui.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat memperbarui deskripsi grup: ' + e.message }, { quoted: msg });
    }
  },
}; 

// [berhasil] fitur set desc group ✓