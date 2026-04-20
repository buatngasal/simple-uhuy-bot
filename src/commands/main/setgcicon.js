const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'setgcicon',
  description: 'Ubah ikon grup via pencarian Yandex atau reply gambar',
  usage: `${commandPrefix}setgcicon [query/reply gambar]`,
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Perintah ini hanya untuk grup.' }, { quoted: msg });
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isImageQuoted = quoted?.imageMessage || quoted?.viewOnceMessageV2?.message?.imageMessage;

    // --- LOGIKA 1: JIKA MENGUTIP/REPLY GAMBAR ---
    if (isImageQuoted) {
      try {
        await sock.sendMessage(msg.key.remoteJid, { text: '🔄 Mengunduh gambar yang di-reply...' }, { quoted: msg });
        
        const imgMsg = quoted.imageMessage || quoted.viewOnceMessageV2.message.imageMessage;
        const stream = await downloadContentFromMessage(imgMsg, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        await sock.updateProfilePicture(msg.key.remoteJid, buffer);
        return sock.sendMessage(msg.key.remoteJid, { text: '✅ Ikon grup berhasil diubah dari gambar yang di-reply!' }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal memproses gambar reply: ' + e.message }, { quoted: msg });
      }
    }

    // --- LOGIKA 2: JIKA MENGGUNAKAN KATA KUNCI (YANDEX) ---
    if (!args.length) {
      return sock.sendMessage(msg.key.remoteJid, { 
        text: `Kirim perintah dengan kata kunci atau reply sebuah gambar.\nContoh: ${commandPrefix}setgcicon logo gaming` 
      }, { quoted: msg });
    }

    let tempOutput = null;
    let browser;
    const queryText = args.join(' ');
    await sock.sendMessage(msg.key.remoteJid, { text: `🔎 Mencari gambar di Yandex: *${queryText}*...` }, { quoted: msg });

    try {
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      tempOutput = path.join(tempDir, `gcpic-${Date.now()}.jpg`);

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1000, height: 1000 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const url = `https://yandex.com/images/search?from=tabbar&text=${queryText}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      const imageSelector = '.SerpItem-Thumb';
      await page.waitForSelector(imageSelector, { timeout: 15000 });

      const images = await page.$$(imageSelector);
      const randomIndex = Math.floor(Math.random() * Math.min(images.length, 5));
      await images[randomIndex].click();
      
      const hdImageSelector = 'img.canvas-card__image, img.MMImage-Origin';
      await page.waitForSelector(hdImageSelector, { timeout: 10000 });

      const imageUrl = await page.evaluate((sel) => {
        const img = document.querySelector(sel);
        return img ? img.src : null;
      }, hdImageSelector);

      if (imageUrl && imageUrl.startsWith('http')) {
        const response = await axios({ url: imageUrl, method: 'GET', responseType: 'arraybuffer' });
        fs.writeFileSync(tempOutput, response.data);
      } else {
        const hdElement = await page.$(hdImageSelector);
        await hdElement.screenshot({ path: tempOutput });
      }

      const imageBuffer = fs.readFileSync(tempOutput);
      await sock.updateProfilePicture(msg.key.remoteJid, imageBuffer);
      
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Ikon grup berhasil diubah menggunakan hasil Yandex: *${queryText}*` }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal: ' + error.message }, { quoted: msg });
    } finally {
      if (browser) await browser.close();
      if (tempOutput && fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    }
  },
};

// [fix] fitur ganti gambar grup menggunakan kata kunci dan reply gambar ✓
