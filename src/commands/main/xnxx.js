const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { commandPrefix } = require('../../../config');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'xnxx',
  description: 'Cari dan download video langsung dari XNXX',
  usage: `${commandPrefix}xnxx <keywords>`,
  async execute(sock, msg, args) {
    const remoteJid = msg.key.remoteJid;
    const input = args.join(' ');
    const tempDir = path.join(__dirname, '../temp');
    
    if (!input) return sock.sendMessage(remoteJid, { text: `Contoh: ${commandPrefix}xnxx japanese` });
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    let browser;
    let tempVideoPath = null;

    try {
      await sock.sendMessage(remoteJid, { text: `🔍 Mencari video terbaik untuk: *${input}*...` });

      browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      const page = await browser.newPage();
      
      // Tahap 1: Pencarian via ProxySite
      const searchUrl = `https://www.xnxx.com/search/0-10min/${encodeURIComponent(input)}`;
      await page.goto('https://proxysite.com', { waitUntil: 'domcontentloaded' });
      await page.type('input[name="d"]', searchUrl);
      await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation()]);

      // Ambil link video pertama dari hasil pencarian
      await page.waitForSelector('.thumb-block', { timeout: 20000 });
      const targetUrl = await page.evaluate(() => {
        const firstBlock = document.querySelector('.thumb-block a');
        return firstBlock ? firstBlock.href : null;
      });

      if (!targetUrl) throw new Error("Video tidak ditemukan.");

      // Tahap 2: Navigasi ke halaman video tujuan
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Tunggu sampai selector video dan judul muncul
      const videoSelector = 'video.vjs-tech';
      await page.waitForSelector(videoSelector, { timeout: 30000 });

      // Ambil Data sesuai Inspect Element yang Anda berikan
      const videoData = await page.evaluate(() => {
        const v = document.querySelector('video.vjs-tech');
        const titleEl = document.querySelector('.video-title-container strong');
        const metadataEl = document.querySelector('.metadata');
        
        // Membersihkan spasi berlebih pada metadata
        let info = metadataEl ? metadataEl.innerText.replace(/\s+/g, ' ').trim() : "Tidak ada info";

        return { 
          src: v ? v.src : null, 
          title: titleEl ? titleEl.innerText.trim() : "Tanpa Judul",
          metadata: info
        };
      });

      if (!videoData.src) throw new Error("Gagal mendapatkan link sumber video.");

      await sock.sendMessage(remoteJid, { text: `⏳ Mengunduh: *${videoData.title}*...` });

      // Tahap 3: Proses Download via Axios
      const cookies = await page.cookies();
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      const userAgent = await page.evaluate(() => navigator.userAgent);

      tempVideoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
      
      const response = await axios({
        method: 'get',
        url: videoData.src,
        responseType: 'stream',
        headers: {
          'Cookie': cookieString,
          'Referer': page.url(),
          'User-Agent': userAgent
        }
      });

      const writer = fs.createWriteStream(tempVideoPath);
      response.data.pipe(writer);

      await new Promise((res, rej) => {
        writer.on('finish', res);
        writer.on('error', rej);
      });

      // Tahap 4: Validasi Ukuran dan Kirim
      const stats = fs.statSync(tempVideoPath);
      if (stats.size > 64 * 1024 * 1024) {
        await sock.sendMessage(remoteJid, { 
          text: `❌ Ukuran file terlalu besar: *${(stats.size/1024/1024).toFixed(2)}MB*\nLimit WhatsApp adalah 64MB.` 
        });
      } else {
        await sock.sendMessage(remoteJid, { 
          video: fs.readFileSync(tempVideoPath), 
          caption: `🎥 *X N X X*\n\n📝 *Judul:* ${videoData.title}\nℹ️ *Info:* ${videoData.metadata}`,
          mimetype: 'video/mp4'
        }, { quoted: msg });
      }

    } catch (e) {
      console.error(e);
      await sock.sendMessage(remoteJid, { text: `❌ Terjadi kesalahan: ${e.message}` });
    } finally {
      if (browser) await browser.close();
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        try { fs.unlinkSync(tempVideoPath); } catch (err) {}
      }
    }
  }
};

// [fix] XNXX video downloader via keywords
