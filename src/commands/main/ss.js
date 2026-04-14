const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

// Gunakan plugin stealth untuk menghindari deteksi bot
puppeteer.use(StealthPlugin());

module.exports = {
  name: 'ss',
  description: 'Mengambil screenshot dari URL Website',
  usage: `${commandPrefix}ss <url>`,
  async execute(sock, msg, args) {
    let tempOutput = null;

    if (!args[0] || !args[0].startsWith('http')) {
      return sock.sendMessage(msg.key.remoteJid, { 
        text: `Silakan masukkan URL yang valid.\nContoh: ${commandPrefix}ss https://google.com` 
      }, { quoted: msg });
    }

    const url = args[0];
    await sock.sendMessage(msg.key.remoteJid, { text: '🔄 Memproses screenshot...' }, { quoted: msg });

    // Setup direktori temp
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    tempOutput = path.join(tempDir, `ss-${Date.now()}.png`);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new", // "new" lebih sulit dideteksi daripada headless: true lama
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled', // Sembunyikan flag navigator.webdriver
          '--window-size=1920,1080'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set User Agent asli (pilih salah satu Chrome versi terbaru)
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Set viewport agar konsisten
      await page.setViewport({ 
        width: 2560,
        height: 1440, 
        deviceScaleFactor: 1.0 // Opsi Zoom Out 50% menggunakan Viewport
      });

      // Override beberapa property agar tidak terdeteksi
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      // Buka URL dengan timeout yang cukup
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 90000 // Beri waktu lebih lama (90 detik) untuk Cloudflare
      });

      // TRIK: Tunggu sebentar setelah load (mengatasi Cloudflare Turnstile yang butuh waktu verifikasi)
      await new Promise(resolve => setTimeout(resolve, 10000)); 

      // Ambil Screenshot
      await page.screenshot({ 
        path: tempOutput, 
        fullPage: false,
        type: 'png'
      });

      await browser.close();

      // Kirim hasil
      const imageBuffer = fs.readFileSync(tempOutput);
      await sock.sendMessage(msg.key.remoteJid, { 
        image: imageBuffer, 
        caption: `✅ Screenshot Berhasil\nURL: ${url}` 
      }, { quoted: msg });

    } catch (error) {
      console.error('Screenshot error:', error);
      if (browser) await browser.close();
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal. Website mungkin memiliki proteksi bot yang sangat kuat atau URL tidak dapat diakses.' }, { quoted: msg });
    } finally {
      // Hapus file sementara
      try {
        if (tempOutput && fs.existsSync(tempOutput)) {
          fs.unlinkSync(tempOutput);
        }
      } catch (e) {
        console.error('Error cleanup:', e.message);
      }
    }
  },
};

// [fix] fitur screenshot web dengan URL
