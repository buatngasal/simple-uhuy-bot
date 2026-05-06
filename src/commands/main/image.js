const { yandexImage } = require('../../lib/scraper-yandex-image');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'image',
  description: 'Mencari gambar via Yandex Images',
  usage: `${commandPrefix}image <query>`,
  async execute(sock, msg, args) {
    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, { 
        text: `*Contoh* : ${commandPrefix}image bintang` 
      }, { quoted: msg });
    }

    const query = args.join(' ');
    await sock.sendMessage(msg.key.remoteJid, { text: `🔎 Mencari gambar: *${query}*...` }, { quoted: msg });

    try {
      // Memanggil fungsi dari library
      const imageBuffer = await yandexImage(query);

      await sock.sendMessage(msg.key.remoteJid, { 
        image: imageBuffer, 
        caption: `*✅ Y A N D E X ◦ I M A G E*` 
      }, { quoted: msg });

    } catch (error) {
      console.error('Image Command Error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal mengambil gambar. Coba kata kunci lain.' }, { quoted: msg });
    }
  },
};

// [berhasil] fitur image untuk mencari gambar menggunakan kata kunci ✓
