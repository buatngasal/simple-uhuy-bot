const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { processOCR } = require('../../lib/ocr');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'ocr',
  description: 'Membaca teks dari gambar (OCR)',
  usage: `${commandPrefix}ocr <reply_gambar>`,
  async execute(sock, msg, args) {
    try {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      const isImage = msg.message.imageMessage;
      const isQuotedImage = quoted?.imageMessage;

      if (!isImage && !isQuotedImage) {
        return sock.sendMessage(msg.key.remoteJid, { 
          text: `Silakan balas gambar dengan perintah: *${commandPrefix}ocr*` 
        }, { quoted: msg });
      }

      // Download buffer
      const targetMsg = isQuotedImage ? { key: msg.key, message: quoted } : msg;
      const buffer = await downloadMediaMessage(targetMsg, 'buffer');

      await sock.sendMessage(msg.key.remoteJid, { text: '🔍 Sedang memproses...' }, { quoted: msg });

      // Gunakan library OCR
      const text = await processOCR(buffer);

      if (!text) {
        return sock.sendMessage(msg.key.remoteJid, { text: '❌ Teks tidak ditemukan.' }, { quoted: msg });
      }

      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });

    } catch (error) {
      console.error('OCR Command Error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan sistem.' }, { quoted: msg });
    }
  },
};

// [berhasil] fitur OCR untuk membaca teks pada gambar ✓
