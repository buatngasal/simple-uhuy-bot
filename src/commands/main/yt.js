const axios = require('axios');
const { Downloader } = require('abot-scraper');
const { formatError, formatLoading } = require('../../lib/response-helper');
const { commandPrefix } = require('../../../config');

const downloader = new Downloader();

module.exports = {
  name: 'yt',
  description: 'Download YouTube via URL',
  usage: `${commandPrefix}yt <link youtube>`,
  async execute(sock, msg, args) {
    const url = args[0]; // Ambil URL dari argumen pertama

    // 1. Validasi Input URL
    if (!url || !url.includes('youtu')) {
      return await sock.sendMessage(msg.key.remoteJid, {
        text: formatError('URL tidak valid', `Contoh: ${commandPrefix}yt https://youtube.com`)
      }, { quoted: msg });
    }

    try {
      // 2. Tampilkan Loading
      await sock.sendMessage(msg.key.remoteJid, {
        text: formatLoading(`Sedang memproses link YouTube...`)
      }, { quoted: msg });

      // 3. Proses Download Audio
      const dlResult = await downloader.ytMp3Downloader(url);
      const res = dlResult.result || dlResult; // Menyesuaikan struktur return scraper

      const audioUrl = res.downloadUrl || res.url;

      if (!audioUrl) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: formatError('Gagal', 'Tidak dapat menemukan link download YouTube.')
        }, { quoted: msg });
      }

      // 4. Ambil Buffer Audio via Axios
      const audioRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'audio/mpeg'
        },
        timeout: 60000
      });

      // 5. Kirim sebagai Document MP3
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          document: Buffer.from(audioRes.data),
          mimetype: 'audio/mpeg',
          fileName: `${res.title || 'audio'}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: res.title || 'YouTube Video',
              body: 'Audio Downloaded via Uhuy-Bot',
              thumbnailUrl: res.thumbnail || res.image,
              sourceUrl: url,
              mediaType: 1,
              showAdAttribution: true,
              renderLargerThumbnail: true
            }
          }
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error('yt vn error:', e.message);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: formatError('Gagal', 'Terjadi kesalahan sistem.') },
        { quoted: msg }
      );
    }
  }
};

// [fix] youtube downloader via URL ✓
