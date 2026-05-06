const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { commandPrefix } = require('../../../config');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'get',
  description: 'Download file/media via URL',
  async execute(sock, msg, args) {
    if (!args[0]) return await sock.sendMessage(msg.key.remoteJid, { text: `*Contoh* : ${commandPrefix}get <url>` });

    const targetUrl = args[0];
    let tempFilePath = null;

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang mengunduh file...' }, { quoted: msg });

      // 1. Dapatkan Metadata File (Cek ukuran & tipe file)
      const response = await axios({
        method: 'get',
        url: targetUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        },
        timeout: 60000 // 1 menit timeout
      });

      // 2. Tentukan Nama File & Ekstensi
      const contentType = response.headers['content-type'] || '';
      const contentDisposition = response.headers['content-disposition'] || '';
      
      // Ambil nama file dari header atau dari URL
      let fileName = 'file_download';
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) {
        fileName = match[1];
      } else {
        fileName = path.basename(new URL(targetUrl).pathname) || 'file_download';
      }

      // 3. Siapkan Folder Temp
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      tempFilePath = path.join(tempDir, `${Date.now()}-${fileName}`);

      // 4. Download File menggunakan Stream
      const writer = fs.createWriteStream(tempFilePath);
      await pipeline(response.data, writer);

      // 5. Kirim ke WhatsApp sesuai Tipe Media
      const stats = fs.statSync(tempFilePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB > 100) { // Limit WhatsApp (bisa disesuaikan)
        throw new Error('Ukuran file terlalu besar (Max 100MB)');
      }

      const isImage = contentType.includes('image');
      const isVideo = contentType.includes('video');
      const isAudio = contentType.includes('audio');

      let messageOptions = {};

      if (isImage) {
        messageOptions = { image: { url: tempFilePath }, caption: `✅ *Berhasil diunduh*:\n${fileName}` };
      } else if (isVideo) {
        messageOptions = { video: { url: tempFilePath }, caption: `✅ *Berhasil diunduh*:\n${fileName}` };
      } else if (isAudio) {
        messageOptions = { audio: { url: tempFilePath }, mimetype: contentType };
      } else {
        // Default kirim sebagai dokumen
        messageOptions = { 
          document: { url: tempFilePath }, 
          mimetype: contentType, 
          fileName: fileName,
          caption: `✅ *File Downloaded*` 
        };
      }

      await sock.sendMessage(msg.key.remoteJid, messageOptions, { quoted: msg });

    } catch (e) {
      console.error('Download Error:', e);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal mengunduh: ${e.message}` }, { quoted: msg });
    } finally {
      // 6. Hapus File Temp setelah dikirim
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (err) {}
      }
    }
  }
};

// [berhasil] fitur get untuk mengambil / mendownload file menggunakan URL web ✓
