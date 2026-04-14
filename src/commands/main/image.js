const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Tambahkan axios untuk download gambar langsung
const { commandPrefix } = require('../../../config');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'image',
  description: 'Mencari gambar via Yandex Images',
  usage: `${commandPrefix}image <query>`,
  async execute(sock, msg, args) {
    let tempOutput = null;

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, { 
        text: `Silakan masukkan kata kunci gambar.\nContoh: ${commandPrefix}image burung beo` 
      }, { quoted: msg });
    }

    const query = encodeURIComponent(args.join(' '));
    const url = `https://yandex.com/images/search?from=tabbar&text=${query}`;

    await sock.sendMessage(msg.key.remoteJid, { text: `🔎 Mencari gambar: *${args.join(' ')}*...` }, { quoted: msg });

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    tempOutput = path.join(tempDir, `yandex-${Date.now()}.jpg`);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 1000 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      const imageSelector = '.SerpItem-Thumb';
      await page.waitForSelector(imageSelector, { timeout: 15000 });

      const images = await page.$$(imageSelector);
      if (images.length > 0) {
        // Pilih salah satu dari 5 hasil pertama agar lebih akurat
        const randomIndex = Math.floor(Math.random() * Math.min(images.length, 5));
        
        // Klik gambar untuk membuka mode HD/Preview
        await images[randomIndex].click();
        
        // Tunggu elemen gambar HD muncul di panel pratinjau
        // Selector .canvas-card__image adalah standar Yandex untuk gambar besar
        const hdImageSelector = 'img.canvas-card__image, img.MMImage-Origin';
        await page.waitForSelector(hdImageSelector, { timeout: 10000 });

        // Ambil URL gambar asli (HD)
        const imageUrl = await page.evaluate((sel) => {
          const img = document.querySelector(sel);
          return img ? img.src : null;
        }, hdImageSelector);

        if (imageUrl && imageUrl.startsWith('http')) {
          // Download gambar menggunakan axios agar mendapatkan file asli, bukan screenshot
          const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream'
          });

          const writer = fs.createWriteStream(tempOutput);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
        } else {
          // Fallback ke screenshot elemen jika download gagal
          const hdElement = await page.$(hdImageSelector);
          await hdElement.screenshot({ path: tempOutput });
        }
      } else {
        throw new Error('Gambar tidak ditemukan');
      }

      await browser.close();

      const imageBuffer = fs.readFileSync(tempOutput);
      await sock.sendMessage(msg.key.remoteJid, { 
        image: imageBuffer, 
        caption: `✅ Hasil untuk: *${args.join(' ')}*\nSource: Yandex Images` 
      }, { quoted: msg });

    } catch (error) {
      console.error('Image Error:', error);
      if (browser) await browser.close();
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal mengambil gambar.' }, { quoted: msg });
    } finally {
      if (tempOutput && fs.existsSync(tempOutput)) {
        try { fs.unlinkSync(tempOutput); } catch (e) {}
      }
    }
  },
};

// [fix] image downloader by keywords
