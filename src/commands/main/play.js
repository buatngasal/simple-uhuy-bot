const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const { Downloader } = require('abot-scraper');
const { formatError, formatLoading } = require('../../lib/response-helper');

// Regex untuk validasi link YouTube
const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

puppeteer.use(StealthPlugin());
const downloader = new Downloader();

module.exports = {
  name: 'play',
  description: 'Download langsung audio YouTube via link atau kata kunci',
  async execute(sock, msg, args) {
    const query = args.join(' ');
    if (!query) return sock.sendMessage(msg.key.remoteJid, { text: formatError('Input kosong', 'Masukkan judul lagu atau link YouTube!') });

    let browser = null;
    let videoData = { title: 'YouTube Audio', link: '', thumb: '' };

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: formatLoading(`Memproses: *${query}*...`) }, { quoted: msg });

      // CEK APAKAH INPUT ADALAH LINK
      if (ytRegex.test(query)) {
        videoData.link = query;
        // Opsional: Jika ingin ambil judul/thumb dari link, bisa pakai scraping ringan atau API
        // Di sini kita set link langsung untuk mempercepat proses
      } else {
        // PROSES SCRAPING JIKA INPUT ADALAH KATA KUNCI
        browser = await puppeteer.launch({
          headless: "new",
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
        
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=CAESAhgD`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        const videoSelector = 'ytd-video-renderer';
        await page.waitForSelector(videoSelector, { timeout: 15000 });

        const scraped = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const titleEl = el.querySelector('#video-title');
          const thumbEl = el.querySelector('img');
          return {
            title: titleEl ? titleEl.innerText.trim() : 'YouTube Audio',
            link: titleEl ? 'https://youtube.com' + titleEl.getAttribute('href') : null,
            thumb: thumbEl ? thumbEl.src : ''
          };
        }, videoSelector);

        if (!scraped || !scraped.link) throw new Error('Video tidak ditemukan.');
        videoData = scraped;
        await browser.close();
      }

      // PROSES DOWNLOAD
      const dlResult = await downloader.ytMp3Downloader(videoData.link);
      const audioUrl = dlResult.result?.downloadUrl || dlResult.downloadUrl || dlResult.url;

      if (!audioUrl) throw new Error('Link download tidak tersedia.');

      const audioRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 60000
      });

      // KIRIM AUDIO
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          audio: Buffer.from(audioRes.data),
          mimetype: 'audio/mpeg',
          fileName: `${videoData.title}.mp3`,
          ptt: false,
          contextInfo: {
            externalAdReply: {
              title: videoData.title,
              body: 'YouTube Scraper Result',
              thumbnailUrl: videoData.thumb,
              sourceUrl: videoData.link,
              mediaType: 2,
              showAdAttribution: true
            }
          }
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error('Play Error:', e);
      if (browser) await browser.close();
      await sock.sendMessage(msg.key.remoteJid, { text: formatError('Error', e.message) });
    }
  }
};

// [fix] youtube play: support download direct audio via URL & keywords ✓
