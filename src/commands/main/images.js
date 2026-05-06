const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

puppeteer.use(StealthPlugin());

// --- FUNGSI RANDOM USER-AGENT ---
const getRandomUA = () => {
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  ];
  return uas[Math.floor(Math.random() * uas.length)];
};

module.exports = {
  name: 'images',
  description: 'Mencari 5 gambar dari Yandex Images',
  async execute(sock, msg, args) {
    let browser = null;

    try {
      if (args.length === 0) return await sock.sendMessage(msg.key.remoteJid, { text: `*Contoh* : ${commandPrefix}images cupang` }, { quoted: msg });
      
      const query = args.join(' ');
      await sock.sendMessage(msg.key.remoteJid, { text: `⏳ Mencari gambar untuk: *${query}*...` }, { quoted: msg });

      // Mengubah spasi menjadi '+' agar lebih natural bagi Yandex
      const encodedQuery = encodeURIComponent(query).replace(/%20/g, '+');
      const targetUrl = `https://yandex.com/images/search?text=${encodedQuery}+terbaru`;

      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      const page = await browser.newPage();
      
      // Set identitas browser secara acak
      await page.setUserAgent(getRandomUA());
      await page.setViewport({ width: 1366, height: 768 });

      // 1. Buka Halaman
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // 2. Simulasi Interaksi: Scroll sedikit untuk memicu pemuatan gambar (Lazy Load)
      await page.evaluate(() => window.scrollBy(0, 800));
      
      // Jeda acak 1-2 detik agar tidak terdeteksi sebagai gerakan kaku robot
      await new Promise(res => setTimeout(res, Math.floor(Math.random() * 1000) + 1000));

      // 3. Tunggu elemen gambar muncul
      try {
        await page.waitForSelector('.SerpItem img', { timeout: 15000 });
      } catch (e) {
        console.log("Selector timeout, mencoba mengambil data yang ada...");
      }

      // 4. Ambil Dataset URL Gambar
      const imageUrls = await page.evaluate(() => {
        // Mengambil elemen gambar berdasarkan class yang kita bedah di inspect element
        const elements = Array.from(document.querySelectorAll('.SerpItem img, img.ImagesContentImage-Image'));
        
        return elements
          .map(el => el.src || el.getAttribute('data-src')) // Ambil src atau data-src
          .filter(url => url && url.includes('http') && !url.includes('data:image')) // Filter URL valid
          .slice(0, 5); // Batasi 5 gambar
      });

      await browser.close();

      if (imageUrls.length === 0) {
        return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal mendapatkan gambar. Yandex mungkin memblokir akses bot.' }, { quoted: msg });
      }

      // 5. Kirim Gambar ke WhatsApp
      for (let i = 0; i < imageUrls.length; i++) {
        await sock.sendMessage(
          msg.key.remoteJid, 
          { 
            image: { url: imageUrls[i] },
            caption: `✅ Hasil ke-${i + 1} untuk: *${query}*`
          }, 
          { quoted: msg }
        );
      }

    } catch (e) {
      console.error('Images Error:', e);
      if (browser) await browser.close();
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  }
};

// [berhasil] fitur images untuk mencari 5 gambar menggunakan kata kunci ✓
