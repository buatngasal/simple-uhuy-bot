const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const sharp = require('sharp');
const axios = require('axios');
const { commandPrefix } = require('../../../config');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'ig',
  description: 'Download Instagram Photo/Video',
  usage: `${commandPrefix}ig <instagram_url>`,
  async execute(sock, msg, args) {
    const urlInput = args[0];

    // FILTER VALIDASI LINK INSTAGRAM
    const igRegex = /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(p|reels|reel|tv)\/.*$/i;
    if (!urlInput || !igRegex.test(urlInput)) {
      return await sock.sendMessage(msg.key.remoteJid, { 
        text: `*Contoh* : ${commandPrefix}ig https://www.instagram.com/p/ByxKbUSnubS/?utm_source=ig_web_copy_link` 
      }, { quoted: msg });
    }

    let browser = null;

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang memproses link instagram...' }, { quoted: msg });

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      await page.goto('https://snapinsta.to', { waitUntil: 'networkidle2' });

      // Input URL & Klik Unduh
      await page.waitForSelector('#s_input');
      await page.type('#s_input', urlInput, { delay: 50 });
      await page.click('button.btn-default');

      // Tunggu hasil & Tutup iklan otomatis jika ada
      await page.waitForSelector('.download-items__btn a, #dlModal', { timeout: 60000 });
      await page.evaluate(() => {
        const modal = document.querySelector('#dlModal');
        if (modal) {
          const closeBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Tutup') || b.innerText.includes('Close'));
          if (closeBtn) closeBtn.click();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Ambil data download
      const downloadData = await page.evaluate(() => {
        const btn = document.querySelector('.download-items__btn a') || document.querySelector('#search-result a[download]');
        if (!btn) return null;
        const isPhoto = btn.innerText.toLowerCase().includes('foto') || btn.innerText.toLowerCase().includes('photo');
        return { url: btn.href, isPhoto };
      });

      await browser.close();
      if (!downloadData) throw new Error('❌ Link tidak ditemukan');

      // Download file ke Buffer
      const response = await axios.get(downloadData.url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');

      if (downloadData.isPhoto) {
        // --- PROSES SHARP (Agar Foto Stabil) ---
        const processedImg = await sharp(buffer)
          .jpeg({ quality: 90 })
          .toBuffer();

        await sock.sendMessage(msg.key.remoteJid, { 
          image: processedImg, 
          caption: `*✅ I N S T A G R A M*`
        }, { quoted: msg });

      } else {
        // --- PROSES VIDEO ---
        await sock.sendMessage(msg.key.remoteJid, { 
          video: buffer, 
          caption: `*✅ I N S T A G R A M*` 
        }, { quoted: msg });
      }

    } catch (e) {
      if (browser) await browser.close();
      console.error(e);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal memproses link Instagram' }, { quoted: msg });
    }
  }
};

// [berhasil] instagram downloader via URL ✓
