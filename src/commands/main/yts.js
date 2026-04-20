const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const { Downloader } = require('abot-scraper');

puppeteer.use(StealthPlugin());
const downloader = new Downloader();

const ytSessions = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000; 

module.exports = {
  name: 'yts',
  description: 'Cari video atau download langsung via link YouTube',
  async execute(sock, msg, args) {
    const remoteJid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) return sock.sendMessage(remoteJid, { text: 'Masukkan kata kunci atau link YouTube!' });

    // --- FITUR: DETEKSI LINK OTOMATIS ---
    const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(query);
    
    if (isUrl) {
      await sock.sendMessage(remoteJid, { text: `⏳ Link terdeteksi. Sedang memproses audio...` }, { quoted: msg });
      try {
        const dlResult = await downloader.ytMp3Downloader(query);
        const audioUrl = dlResult.result?.downloadUrl || dlResult.downloadUrl;

        if (!audioUrl) throw new Error('Gagal mendapatkan link download.');

        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });

        await sock.sendMessage(remoteJid, {
          audio: Buffer.from(audioRes.data),
          mimetype: 'audio/mpeg',
          fileName: `youtube_audio.mp3`,
          contextInfo: {
            externalAdReply: {
              title: "YouTube Downloader",
              body: "Audio berhasil diunduh",
              mediaType: 2,
              showAdAttribution: true
            }
          }
        }, { quoted: msg });
        return; // Berhenti di sini jika sudah download via link
      } catch (err) {
        console.error(err);
        return sock.sendMessage(remoteJid, { text: '❌ Gagal mengunduh audio dari link tersebut.' });
      }
    }

    // --- LOGIKA PILIH NOMOR (Sesi Aktif) ---
    if (!isNaN(query) && ytSessions.has(remoteJid)) {
      const sessionData = ytSessions.get(remoteJid);
      const index = parseInt(query) - 1;

      if (index < 0 || index >= sessionData.videos.length) {
        return sock.sendMessage(remoteJid, { text: '❌ Nomor tidak valid.' });
      }

      clearTimeout(sessionData.timeoutId);
      const selectedVideo = sessionData.videos[index];
      
      try {
        await sock.sendMessage(remoteJid, { text: `⏳ Mendownload audio: *${selectedVideo.title}*...` }, { quoted: msg });
        const dlResult = await downloader.ytMp3Downloader(selectedVideo.link);
        const audioUrl = dlResult.result?.downloadUrl || dlResult.downloadUrl;
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });

        await sock.sendMessage(remoteJid, {
          audio: Buffer.from(audioRes.data),
          mimetype: 'audio/mpeg',
          fileName: `${selectedVideo.title}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: selectedVideo.title,
              body: `Viewer: ${selectedVideo.views} | Durasi: ${selectedVideo.duration}`,
              thumbnailUrl: selectedVideo.thumbnail,
              sourceUrl: selectedVideo.link,
              mediaType: 2
            }
          }
        }, { quoted: msg });

        ytSessions.delete(remoteJid);
        return;
      } catch (err) {
        ytSessions.delete(remoteJid);
        return sock.sendMessage(remoteJid, { text: '❌ Terjadi kesalahan saat download.' });
      }
    }

    // --- LOGIKA PENCARIAN (Puppeteer) ---
    let browser = null;
    try {
      await sock.sendMessage(remoteJid, { text: '🔍 Mencari 10 video teratas...' }, { quoted: msg });

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
      await page.goto(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=CAESAhgD`, { waitUntil: 'networkidle2' });

      const videoSelector = 'ytd-video-renderer';
      await page.waitForSelector(videoSelector);

      const videos = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('ytd-video-renderer')).slice(0, 10).map(el => ({
          title: el.querySelector('#video-title')?.innerText.trim() || 'N/A',
          link: 'https://youtube.com' + el.querySelector('#video-title')?.getAttribute('href'),
          views: el.querySelector('#metadata-line')?.innerText.split('\n')[0] || 'N/A',
          duration: el.querySelector('span.ytd-thumbnail-overlay-time-status-renderer')?.innerText.trim() || 'N/A',
          thumbnail: el.querySelector('img')?.src || ''
        }));
      });

      if (videos.length === 0) throw new Error('Kosong');

      if (ytSessions.has(remoteJid)) clearTimeout(ytSessions.get(remoteJid).timeoutId);

      const timeoutId = setTimeout(() => {
        if (ytSessions.has(remoteJid)) {
          ytSessions.delete(remoteJid);
          sock.sendMessage(remoteJid, { text: '⏰ Waktu pemilihan habis.' });
        }
      }, SESSION_TIMEOUT);

      ytSessions.set(remoteJid, { videos, timeoutId });

      let caption = `*📺 HASIL PENCARIAN YOUTUBE*\n\n`;
      videos.forEach((v, i) => {
        caption += `${i + 1}. *${v.title}*\n`;
        caption += `   └ ⏳ ${v.duration} | 👀 ${v.views}\n`;
        caption += `   └ 🔗 ${v.link}\n\n`;
      });
      caption += `\n*Balas dengan nomor (1-10) untuk download MP3.*`;

      await sock.sendMessage(remoteJid, { text: caption }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, { text: '❌ Gagal mencari video.' });
    } finally {
      if (browser) await browser.close();
    }
  }
};

// [fix] youTube search: support searching by keywords and URLs ✓
