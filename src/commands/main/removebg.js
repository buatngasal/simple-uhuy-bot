const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { removeBG } = require('../../../src/lib/scraper-background-remover');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'removebg',
  description: 'Menghapus latar belakang gambar secara otomatis',
  usage: `${commandPrefix}removebg <reply_gambar>`,
  async execute(sock, msg, args) {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaData = quoted?.imageMessage || msg.message.imageMessage;

    if (!mediaData) return sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Balas gambar dengan perintah: ${commandPrefix}removebg` }, { quoted: msg });

    await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang memproses gambar...' }, { quoted: msg });

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const inputPath = path.join(tempDir, `rbg-${Date.now()}.jpg`);

    try {
      // Download gambar dari WhatsApp
      const stream = await downloadContentFromMessage(mediaData, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      fs.writeFileSync(inputPath, buffer);

      // Panggil Scraper dari Library
      const resultBuffer = await removeBG(inputPath);

      // Kirim Hasil
      await sock.sendMessage(msg.key.remoteJid, { 
        image: resultBuffer, 
        caption: '*✅ B A C K G R O U N D ◦ R E M O V E D*' 
      }, { quoted: msg });

    } catch (error) {
      console.error('RemoveBG Error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
    } finally {
      // Hapus file temp
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
  },
};

// [berhasil] fitur untuk menghapus latar belakang gambar ✓
