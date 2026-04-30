const { instagramDownloader } = require('../../lib/scraper-instagram');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'ig',
  description: 'Download Instagram Photo/Video',
  usage: `${commandPrefix}ig <instagram_url>`,
  async execute(sock, msg, args) {
    const urlInput = args[0]; // Mengambil argumen pertama

    // --- FILTER VALIDASI LINK INSTAGRAM ---
    // Regex ini mencakup: instagram.com, instagr.am, post(p), reel, dan tv
    const igRegex = /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(p|reels|reel|tv)\/([a-zA-Z0-9\-_]+)/i;

    // 1. Cek apakah ada input
    if (!urlInput) {
      return await sock.sendMessage(msg.key.remoteJid, { 
        text: `*Contoh* : ${commandPrefix}ig https://www.instagram.com/reel/DWoSulRD2kt/?igsh=eDFzMHBlc3NpOGlj` 
      }, { quoted: msg });
    }

    // 2. Cek apakah link valid sesuai format Instagram
    if (!igRegex.test(urlInput)) {
      return await sock.sendMessage(msg.key.remoteJid, { 
        text: `❌ Link tidak valid! Pastikan itu adalah link Post, Reel, atau TV Instagram yang publik.` 
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang memproses link Instagram...' }, { quoted: msg });

      // Memanggil library yang sudah diperbaiki
      const { buffer, type } = await instagramDownloader(urlInput);

      const messageContent = type === 'image' 
        ? { image: buffer, caption: `*✅ I N S T A G R A M*` }
        : { video: buffer, caption: `*✅ I N S T A G R A M*`, mimetype: 'video/mp4' };

      await sock.sendMessage(msg.key.remoteJid, messageContent, { quoted: msg });

    } catch (e) {
      console.error("IG Error:", e);
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `❌ *Gagal:* ${e.message.includes('timeout') ? 'Waktu habis, coba lagi nanti.' : 'Media tidak ditemukan atau akun privat.'}` 
      }, { quoted: msg });
    }
  }
};

// [berhasil] instagram downloader via URL ✓
