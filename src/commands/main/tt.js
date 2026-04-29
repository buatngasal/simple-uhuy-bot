const axios = require('axios');
const fs = require('fs');
const { Downloader } = require('abot-scraper');
const downloader = new Downloader();
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'tt',
  description: 'Download TikTok Video',
  usage: `${commandPrefix}tt <tiktok_url>`,
  async execute(sock, msg, args) {
    const url = args[0];
    if (!url) return await sock.sendMessage(msg.key.remoteJid, { text: `*Contoh* : ${commandPrefix}tt https://vt.tiktok.com/ZS9YAw4SF/` }, { quoted: msg });
    try {
      const result = await downloader.tiktokDownloader(url);
      if (result.status === 200 && result.result && result.result.video) {
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang memproses link tiktok...' }, { quoted: msg });
        // Download video as buffer with user-agent
        const videoRes = await axios.get(result.result.video, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        // Debug: save to file (uncomment if needed)
        // fs.writeFileSync('debug_tiktok.mp4', videoRes.data);

        // Cek ukuran
        if (videoRes.data.length > 100 * 1024 * 1024) {
          return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal: Video terlalu besar untuk dikirim via WhatsApp (max 100MB).' }, { quoted: msg });
        }

        await sock.sendMessage(
          msg.key.remoteJid,
          {
            video: Buffer.from(videoRes.data),
            mimetype: 'video/mp4',
            fileName: (result.result.title || 'tiktok') + '.mp4',
            caption: '*✅ T I K T O K*\n\n◦ *Title* : ' + result.result.title || ''
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          msg.key.remoteJid,
          { text: '❌ Error download: ' + (result.msg || JSON.stringify(result) || 'Unknown error') },
          { quoted: msg }
        );
      }
    } catch (e) {
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: '❌ Error: ' + (e.message || JSON.stringify(e) || e) },
        { quoted: msg }
      );
    }
  }
};

// [berhasil] tiktok downloader via URL ✓
// jika terjadi undefined downloader.tiktokDownloader, maka hapus dulu folder abot-scraper di node_modules, lalu install ulang dengan versi: $ npm install abot-scraper@1.6.2