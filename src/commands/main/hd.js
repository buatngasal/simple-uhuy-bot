const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { commandPrefix } = require('../../../config');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'hd',
  description: 'Meningkatkan kualitas gambar buram menjadi jelas',
  usage: `${commandPrefix}hd <reply_gambar>`,
  async execute(sock, msg, args) {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaData = quoted?.imageMessage || msg.message.imageMessage;

    if (!mediaData) return sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Balas gambar dengan perintah: ${commandPrefix}hd` }, { quoted: msg });

    await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang memproses gambar...' }, { quoted: msg });

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const inputPath = path.join(tempDir, `picsart-in-${Date.now()}.jpg`);

    let browser;
    try {
      const stream = await downloadContentFromMessage(mediaData, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      fs.writeFileSync(inputPath, buffer);

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

      await page.goto('https://picsart.com/ai-image-enhancer/', { waitUntil: 'networkidle2', timeout: 60000 });

      // Clean Cookie & Pop-up
      try {
        await page.waitForSelector('button#onetrust-accept-btn-handler', { timeout: 5000 });
        await page.click('button#onetrust-accept-btn-handler');
      } catch (e) {}

      // Upload
      const fileInput = 'input[type="file"]';
      await page.waitForSelector(fileInput);
      const inputHandle = await page.$(fileInput);
      await inputHandle.uploadFile(inputPath);

      // Tunggu hingga proses "Applying" benar-benar hilang dari DOM
      await page.waitForFunction(
        () => !document.body.innerText.includes('Applying the result'),
        { timeout: 120000, polling: 1000 }
      );

      // Tunggu selector gambar asli muncul (berdasarkan inspect element kamu)
      const imageSelector = 'div[class*="Result-root"] img, [data-testid="EnhancedImage"] img';
      await page.waitForSelector(imageSelector, { timeout: 30000 });
      
      // Jeda tambahan agar URL src terisi dengan link blob/cdn yang benar
      await new Promise(r => setTimeout(r, 5000));

      // Ambil URL Gambar Asli
      const imageUrl = await page.evaluate((sel) => {
        const img = document.querySelector(sel);
        return img && img.src.startsWith('http') ? img.src : null;
      }, imageSelector);

      if (!imageUrl) throw new Error("❌ Gagal mendapatkan URL gambar. Coba lagi beberapa saat.");

      // Download langsung menggunakan axios
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      
      await sock.sendMessage(msg.key.remoteJid, { 
        image: Buffer.from(response.data), 
        caption: '*✅ I M A G E ◦ E N H A N C E R*' 
      }, { quoted: msg });

    } catch (error) {
      console.error('HD Error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
    } finally {
      if (browser) await browser.close();
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
  },
};

// [berhasil] fitur HD untuk memperjelas gambar buram ✓
