const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'ip',
  description: 'Menampilkan detail lokasi berdasarkan website WhatIsMyIPAddress',
  async execute(sock, msg, args) {
    const url = 'https://whatismyipaddress.com';
    let tempImgPath = null;
    let browser = null;

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Mengambil detail IP & Lokasi...' }, { quoted: msg });

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 900 });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Tunggu sampai elemen utama muncul
      await page.waitForSelector('.ip-detail.minified', { timeout: 20000 });

      const data = await page.evaluate(() => {
        const results = {};
        
        // 1. Ambil IPv4 dari ID spesifik sesuai screenshot Anda
        const ipv4El = document.querySelector('#ipv4');
        const ipv4 = ipv4El ? ipv4El.innerText.trim() : 'Tidak terdeteksi';

        // 2. Ambil detail ISP & Lokasi dari class .ip-information
        const infoItems = document.querySelectorAll('.ip-information p.information');
        infoItems.forEach(p => {
          const spans = p.querySelectorAll('span');
          if (spans.length >= 2) {
            const label = spans[0].innerText.replace(':', '').trim();
            const value = spans[1].innerText.trim();
            results[label] = value;
          }
        });

        return {
          ipv4: ipv4,
          isp: results['ISP'] || 'Tidak terdeteksi',
          city: results['City'] || 'Tidak terdeteksi',
          region: results['Region'] || 'Tidak terdeteksi',
          country: results['Country'] || 'Tidak terdeteksi'
        };
      });

      // Menentukan area screenshot (mengambil area biru yang mencakup IP dan Info)
      const screenshotSelector = '.ip-detail.minified';
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      tempImgPath = path.join(tempDir, `loc-${Date.now()}.png`);

      const element = await page.$(screenshotSelector);
      if (element) {
        await element.screenshot({ path: tempImgPath });
      }

      await browser.close();

      // Susun Caption Final
      const caption = `*🌐 DETAIL LOKASI IP 🌐*\n\n` +
                      `◦ *IPv4* : ${data.ipv4}\n` +
                      `◦ *ISP* : ${data.isp}\n` +
                      `◦ *City* : ${data.city}\n` +
                      `◦ *Region* : ${data.region}\n` +
                      `◦ *Country* : ${data.country}\n\n` +
                      `_Data source: WhatIsMyIPAddress_`;

      const imageBuffer = fs.readFileSync(tempImgPath);
      await sock.sendMessage(
        msg.key.remoteJid,
        { image: imageBuffer, caption: caption },
        { quoted: msg }
      );

    } catch (e) {
      console.error('IP Command Error:', e);
      if (browser) await browser.close();
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Terjadi kesalahan saat mengambil data.' }, { quoted: msg });
    } finally {
      if (tempImgPath && fs.existsSync(tempImgPath)) {
        try { fs.unlinkSync(tempImgPath); } catch (err) {}
      }
    }
  }
};

// [fix] what is my ip address ✓
