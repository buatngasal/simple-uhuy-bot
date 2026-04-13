const axios = require('axios');
const { Search, Downloader } = require('abot-scraper');
const { formatError, formatLoading } = require('../../lib/response-helper');
const { commandPrefix } = require('../../../config');

const search = new Search();
const downloader = new Downloader();

module.exports = {
  name: 'play',
  description: 'Cari dan download audio YouTube berdasarkan kata kunci atau URL',
  usage: `${commandPrefix}play <judul lagu/URL youtube>`,
  async execute(sock, msg, args) {
    const query = args.join(' ');

    // 1. Validasi Input
    if (!query) {
      return await sock.sendMessage(msg.key.remoteJid, {
        text: formatError('Input kosong', `Contoh: ${commandPrefix}play Rewrite The Stars atau link YouTube`)
      }, { quoted: msg });
    }

    try {
      let videoUrl;
      let videoTitle = 'Audio';
      let videoThumb = '';
      let videoAuthor = 'YouTube Audio';

      // Regex untuk mendeteksi URL YouTube
      const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(query);

      if (isUrl) {
        // Jika input adalah URL
        videoUrl = query;
        // Opsional: Anda bisa menambahkan logic ytSearch(videoUrl) di sini jika ingin mengambil metadata (judul/thumb)
        const checkMeta = await search.ytSearch(videoUrl);
        if (checkMeta.status === 200 && checkMeta.result.length > 0) {
          const meta = checkMeta.result[0];
          videoTitle = meta.title;
          videoThumb = meta.thumbnail || meta.image;
          videoAuthor = meta.author;
        }
      } else {
        // 2. Proses Pencarian jika input bukan URL
        const searchResult = await search.ytSearch(query);
        
        if (searchResult.status !== 200 || !searchResult.result || searchResult.result.length === 0) {
          return await sock.sendMessage(msg.key.remoteJid, {
            text: formatError('Tidak ditemukan', `Hasil pencarian untuk "${query}" tidak ditemukan.`)
          }, { quoted: msg });
        }

        const video = searchResult.result[0];
        videoUrl = video.url;
        videoTitle = video.title;
        videoThumb = video.thumbnail || video.image;
        videoAuthor = video.author;
      }

      // 3. Tampilkan Loading
      await sock.sendMessage(msg.key.remoteJid, {
        text: formatLoading(`Sedang memproses: *${videoTitle}*...`)
      }, { quoted: msg });

      // 4. Proses Download
      const dlResult = await downloader.ytMp3Downloader(videoUrl);
      const audioUrl =
        dlResult.result?.downloadUrl ||
        dlResult.downloadUrl ||
        dlResult.result?.url ||
        dlResult.url;

      if (!audioUrl) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: formatError('Gagal', 'Tidak dapat menemukan link download audio.')
        }, { quoted: msg });
      }

      const audioRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'audio/mpeg'
        },
        maxRedirects: 5,
        timeout: 60000
      });

      // 5. Validasi Ukuran File
      if (audioRes.data.length < 10 * 1024) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: formatError('Gagal', 'File audio rusak atau terlalu kecil.')
        }, { quoted: msg });
      }

      if (audioRes.data.length > 100 * 1024 * 1024) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: formatError('File terlalu besar', 'Ukuran audio melebihi batas 100MB.')
        }, { quoted: msg });
      }

      // 6. Kirim Audio
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          audio: Buffer.from(audioRes.data),
          mimetype: 'audio/mpeg',
          fileName: `${videoTitle}.mp3`,
          ptt: false,
          contextInfo: {
            externalAdReply: {
              title: videoTitle,
              body: videoAuthor,
              thumbnailUrl: videoThumb,
              sourceUrl: videoUrl,
              mediaType: 2,
              showAdAttribution: true
            }
          }
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error('play error:', e.message);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: formatError('Download failed', e.message) },
        { quoted: msg }
      );
    }
  }
};

// [fix] play youtube ✓
