const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const Tesseract = require('tesseract.js');
const path = require('path');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'ocr',
  description: 'Membaca teks dari gambar (OCR)',
  usage: `${commandPrefix}ocr (reply ke gambar)`,
  async execute(sock, msg, args) {
    try {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      let buffer;

      // Logika deteksi gambar (Reply atau Pesan Gambar Langsung)
      if (quoted && quoted.imageMessage) {
        const stream = await downloadMediaMessage(
          { key: msg.key, message: quoted },
          'buffer' // Menggunakan shortcut 'buffer' jika didukung versi Baileys kamu
        );
        buffer = stream;
      } else if (msg.message.imageMessage) {
        buffer = await downloadMediaMessage(msg, 'buffer');
      } else {
        return sock.sendMessage(msg.key.remoteJid, { 
          text: `Silakan reply gambar dengan perintah *${commandPrefix}ocr* untuk membaca teksnya.` 
        }, { quoted: msg });
      }

      // Memberi tahu pengguna bahwa proses sedang berjalan
      await sock.sendMessage(msg.key.remoteJid, { text: '🔍 Sedang memproses gambar, tunggu sebentar...' }, { quoted: msg });

      // Proses OCR menggunakan Tesseract
      const { data: { text } } = await Tesseract.recognize(
        buffer,
        'ind+eng',
        {
          cachePath: path.join(__dirname, '../temp'), // Simpan data bahasa di folder temp
          logger: m => console.log(m) 
        }
      );

      if (!text || text.trim().length === 0) {
        return sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal mengenali teks dalam gambar tersebut.' }, { quoted: msg });
      }

      // Kirim hasil teks
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `${text.trim()}` // Hasil OCR
      }, { quoted: msg });

    } catch (error) {
      console.error('OCR Error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat memproses OCR.' }, { quoted: msg });
    }
  },
};

// [fix] fitur OCR untuk membaca teks pada gambar ✓
