const storageLib = require('../../lib/storage');
const config = require('../../../config');

module.exports = {
  name: 'savefile',
  description: 'Simpan pesan/media ke storage global (tanpa prefix)',
  usage: `${config.commandPrefix}savefile <nama_file>`,
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    const name = args.join(' ');
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!name || !quoted) {
      return sock.sendMessage(id, { 
        text: `❌ *Format Salah!*\nReply sebuah pesan/media lalu ketik:\n*${config.commandPrefix}savefile ${name || 'nama_file'}*` 
      }, { quoted: msg });
    }

    storageLib.saveFile(name, quoted);
    return sock.sendMessage(id, { text: `✅ Berhasil menyimpan *"${name.toLowerCase()}"*.\nSekarang bisa dipanggil tanpa prefix di semua grup.` }, { quoted: msg });
  }
};
