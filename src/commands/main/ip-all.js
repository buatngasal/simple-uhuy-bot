const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'ip-all',
  description: 'Menampilkan detail lokasi IP lengkap',
  async execute(sock, msg, args) {
    let tempImgPath = null;
    let browser = null;

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang melacak lokasi IP...' }, { quoted: msg });

      // 1. Ambil IP Publik
      const getIp = await axios.get('https://api.ipify.org?format=json');
      const myIp = getIp.data.ip;
      const targetUrl = `https://whatismyipaddress.com/ip/${myIp}`;

      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled' // Tambahan agar tidak terdeteksi bot
        ]
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 1200 });

      // 2. Buka URL
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

       // 3. Tunggu selector muncul
      const selector = '.ip-information .inner'; 
      await page.waitForSelector(selector, { timeout: 30000 });

      // --- TAMBAHAN: Ambil Dataset Teks ---
      const ipData = await page.evaluate(() => {
        const results = {};
        // Mencari semua div dengan class 'information' di dalam '.left'
        const infoElements = document.querySelectorAll('.ip-information .left .information');
        
        infoElements.forEach(el => {
          const key = el.querySelector('span:first-child')?.innerText.replace(':', '').trim();
          const value = el.querySelector('span:last-child')?.innerText.trim();
          if (key && value) {
            results[key] = value;
          }
        });
        return results;
      });

      // Format teks untuk dikirim ke WhatsApp
      const textDataset = Object.entries(ipData)
        .map(([key, val]) => `*${key}* : ${val}`)
        .join('\n');

      // 4. Ambil Screenshot
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      tempImgPath = path.join(tempDir, `ip-${Date.now()}.png`);

      const element = await page.$(selector);
      await element.screenshot({ path: tempImgPath });

      await browser.close();

      // 5. Kirim Gambar + Dataset Teks
      const imageBuffer = fs.readFileSync(tempImgPath);
      const caption = `*🌐 IP LOCATION DETAILS 🌐*\n\n${textDataset}\n\n🔗 *Source* : ${targetUrl}`;

      await sock.sendMessage(
        msg.key.remoteJid,
        { 
          image: imageBuffer, 
          caption: caption 
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error('Location Error:', e);
      if (browser) await browser.close();
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal: ${e.message}` }, { quoted: msg });
    } finally {
      if (tempImgPath && fs.existsSync(tempImgPath)) {
        try { fs.unlinkSync(tempImgPath); } catch (err) {}
      }
    }
  }
};

// [fix] what is my ip address details ✓
