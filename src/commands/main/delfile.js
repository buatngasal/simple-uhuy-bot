const storageLib = require('../../lib/storage');
const config = require('../../../config');

module.exports = {
  name: 'delfile',
  description: 'Hapus file dari storage global',
  usage: `${config.commandPrefix}delfile <nama_file>`,
  async execute(sock, msg, args) {
    const name = args.join(' ');
    
    if (!name) {
      const list = storageLib.list();
      let txt = '🗑️ *- HAPUS STORAGE -*\nContoh: `.delfile nama`\n\n*Daftar:* \n';
      txt += list.map(v => `- ${v}`).join('\n');
      return sock.sendMessage(msg.key.remoteJid, { text: txt }, { quoted: msg });
    }

    const success = storageLib.deleteFile(name);
    if (success) {
      return sock.sendMessage(msg.key.remoteJid, { text: `🗑️ File *"${name.toLowerCase()}"* berhasil dihapus.` }, { quoted: msg });
    } else {
      return sock.sendMessage(msg.key.remoteJid, { text: `❌ File *"${name}"* tidak ditemukan.` }, { quoted: msg });
    }
  }
};

// [berhasil] fitur delfile storage untuk menghapus pesan media yang dipanggil tanpa prefix ✓
