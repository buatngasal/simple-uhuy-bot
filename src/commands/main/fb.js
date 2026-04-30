const { commandPrefix } = require('../../../config');
const { facebookDownloader } = require('../../lib/scraper-facebook');

module.exports = {
  name: 'fb',
  description: 'Download Facebook Video',
  usage: `${commandPrefix}fb <facebook_url>`,
  async execute(sock, msg, args) {
    const urlInput = args[0];
    const fbRegex = /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch|web\.facebook\.com)\/.+$/;

    if (!urlInput || !fbRegex.test(urlInput)) {
      return await sock.sendMessage(msg.key.remoteJid, { 
        text: `*Contoh* : ${commandPrefix}fb https://www.facebook.com/share/v/18fZJJBXwK/`
      }, { quoted: msg });
    }

    await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang memproses link facebook...' }, { quoted: msg });

    try {
      const result = await facebookDownloader(urlInput);

      if (!result || !result.link) {
        return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Video tidak ditemukan atau link private.' }, { quoted: msg });
      }

      await sock.sendMessage(msg.key.remoteJid, { 
        video: { url: result.link }, 
        caption: `*✅ F A C E B O O K*\n\n◦ *Kualitas* : ${result.quality}`
      }, { quoted: msg });

    } catch (e) {
      console.error(e);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan sistem.' }, { quoted: msg });
    }
  }
};

// [berhasil] facebook downloader via URL ✓
