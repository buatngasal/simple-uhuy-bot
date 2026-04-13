const axios = require('axios');
const { Downloader } = require('abot-scraper');
const { formatError, formatLoading, isValidYouTubeUrl } = require('../../lib/response-helper');
const downloader = new Downloader();
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'ytmp3',
  description: 'Download audio YouTube (MP3 Document)',
  usage: `${commandPrefix}ytmp3 <youtube_url>`,
  async execute(sock, msg, args) {
    const url = args[0];

    if (!url || !isValidYouTubeUrl(url)) {
      return await sock.sendMessage(msg.key.remoteJid, {
        text: formatError('URL Tidak Valid', `Gunakan: ${commandPrefix}ytmp3 https://youtu.be/...`)
      }, { quoted: msg });
    }

    try {
      const result = await downloader.ytMp3Downloader(url);
      const audioUrl = result.result?.downloadUrl || result.downloadUrl || result.result?.url || result.url;
      
      // Ambil judul video, bersihkan karakter aneh agar aman jadi nama file
      const rawTitle = result.result?.title || result.title || 'youtube_audio';
      const cleanTitle = rawTitle.replace(/[\\/:*?"<>|]/g, '');

      if (!audioUrl) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: formatError('Gagal', 'Link download tidak ditemukan')
        }, { quoted: msg });
      }

      await sock.sendMessage(msg.key.remoteJid, {
        text: formatLoading('Sedang mengunduh audio...')
      }, { quoted: msg });

      const audioRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0...',
          'Accept': 'audio/mpeg'
        },
        timeout: 60000 
      });

      if (audioRes.data.length < 10 * 1024) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: formatError('Gagal', 'File audio rusak atau terlalu kecil')
        }, { quoted: msg });
      }

      // Mengirim sebagai DOKUMEN agar judul muncul otomatis
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          document: Buffer.from(audioRes.data),
          mimetype: 'audio/mpeg',
          fileName: `${cleanTitle}.mp3`, // Judul otomatis di sini
          caption: `Selesai: ${cleanTitle}`
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error('ytmp3 error:', e.message);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: formatError('Terjadi Kesalahan', e.message) },
        { quoted: msg }
      );
    }
  }
};

// [fix] download youtube as MP3 file ✓
