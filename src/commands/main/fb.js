const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { commandPrefix } = require('../../../config');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'fb',
  description: 'Download Facebook Video',
  usage: `${commandPrefix}fb <facebook_url>`,
  async execute(sock, msg, args) {
    const urlInput = args[0]; // Mengambil argumen pertama

    // FILTER VALIDASI LINK FACEBOOK
    const fbRegex = /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch|web\.facebook\.com)\/.+$/;
    if (!urlInput || !fbRegex.test(urlInput)) {
      return await sock.sendMessage(msg.key.remoteJid, { 
        text: `*Contoh* : ${commandPrefix}fb https://www.facebook.com/share/v/18fZJJBXwK/`
      }, { quoted: msg });
    }

    const targetUrl = 'https://snapsave.app';
    let browser = null;

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang memproses link facebook...' }, { quoted: msg });

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // Masukkan URL & Klik Download
      await page.waitForSelector('#url');
      await page.type('#url', urlInput);
      await page.click('#send');

      // Tunggu tabel hasil muncul
      await page.waitForSelector('table.table.is-fullwidth', { timeout: 60000 });

      const videoData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table.table.is-fullwidth tbody tr'));
        let fallbackLink = null;

        for (let row of rows) {
          const columns = row.querySelectorAll('td');
          if (columns.length < 3) continue;
          
          const quality = columns[0].innerText.trim();
          const renderStatus = columns[1].innerText.trim().toLowerCase();
          const downloadBtn = columns[2].querySelector('a');

          if (downloadBtn && downloadBtn.href.startsWith('http')) {
            // Simpan satu link sebagai cadangan (biasanya baris pertama)
            if (!fallbackLink) fallbackLink = { quality, link: downloadBtn.href };

            // Jika menemukan yang tanpa render, langsung ambil dan selesai
            if (renderStatus === 'tidak' || renderStatus.includes('no')) {
              return { quality, link: downloadBtn.href };
            }
          }
        }
        // Jika tidak ada yang "Render: Tidak", gunakan link cadangan tadi
        return fallbackLink;
      });

      if (!videoData || !videoData.link) throw new Error('❌ Link tidak ditemukan');

      await browser.close();

      await sock.sendMessage(msg.key.remoteJid, { 
        video: { url: videoData.link }, 
        caption: `*✅ F A C E B O O K*\n\n◦ *Kualitas* : ${videoData.quality}`
      }, { quoted: msg });

    } catch (e) {
      if (browser) await browser.close();
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal memproses link Facebook' }, { quoted: msg });
    }
  }
};

// [berhasil] facebook downloader via URL ✓
