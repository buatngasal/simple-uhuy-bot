const sharp = require('sharp');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
  name: 'toimg',
  description: 'Mengubah stiker ke Gambar (JPG)',
  usage: `${commandPrefix}toimg <reply_stiker_diam>`,
  async execute(sock, msg, args) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const stickerMsg = quoted?.stickerMessage || msg.message?.stickerMessage;

    if (!stickerMsg) {
      return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Balas stiker diam yang ingin dijadikan gambar!' }, { quoted: msg });
    }

    const tempImg = path.join(os.tmpdir(), `img_${Date.now()}.jpg`);

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Mengonversi ke gambar...' }, { quoted: msg });

      const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Proses Sharp (mengambil frame pertama jika itu animasi)
      await sharp(buffer)
        .flatten({ background: { r: 255, g: 255, b: 255 } }) // Menghindari background hitam
        .toFormat('jpeg')
        .toFile(tempImg);

      await sock.sendMessage(msg.key.remoteJid, {
        image: fs.readFileSync(tempImg),
        caption: '✅ Stiker berhasil diubah menjadi gambar!'
      }, { quoted: msg });

    } catch (e) {
      console.error(e);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal mengonversi ke gambar.' }, { quoted: msg });
    } finally {
      if (fs.existsSync(tempImg)) fs.unlinkSync(tempImg);
    }
  }
};

// [berhasil] fitur ubah stiker diam menjadi gambar ✓
