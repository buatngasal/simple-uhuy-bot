const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { commandPrefix } = require('../../../config');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'ai',
  description: 'Tanya AI via ChatGPT',
  usage: `${commandPrefix}ai <pertanyaan>`,
  async execute(sock, msg, args) {
    if (!args.length) return sock.sendMessage(msg.key.remoteJid, { text: `Contoh: ${commandPrefix}ai apa itu cinta?` }, { quoted: msg });

    // Menggabungkan argumen dan encode untuk URL
    const query = args.join(' ');
    const encodedQuery = encodeURIComponent(query).replace(/%20/g, '+');
    const targetUrl = ` https://chatgpt.com/?q=${encodedQuery}`;

    await sock.sendMessage(msg.key.remoteJid, { text: '🤖 Sedang memproses jawaban...' }, { quoted: msg });

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      // Membuka URL
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // TUNGGU SAMPAI JAWABAN MUNCUL DAN SELESAI MENGETIK
      const selector = '[data-message-author-role="assistant"]';
      await page.waitForSelector(selector, { timeout: 30000 });

      // Fungsi cerdas: Tunggu sampai teks berhenti berubah (indikasi selesai mengetik)
      const aiResponse = await page.evaluate(async (sel) => {
        const getLatest = () => {
            const nodes = document.querySelectorAll(sel);
            return nodes.length > 0 ? nodes[nodes.length - 1].innerText : null;
        };

        let lastText = "";
        let currentText = getLatest();
        
        // Loop kecil untuk memastikan teks sudah berhenti "animasi mengetik"
        for (let i = 0; i < 10; i++) { 
            if (currentText && currentText === lastText && currentText.length > 5) break;
            lastText = currentText;
            await new Promise(r => setTimeout(r, 2000)); // Cek setiap 2 detik
            currentText = getLatest();
        }
        return currentText;
      }, selector);

      await browser.close();

      if (!aiResponse || aiResponse.length < 5) {
        throw new Error('Response too short or empty');
      }

      await sock.sendMessage(msg.key.remoteJid, { text: aiResponse.trim() }, { quoted: msg });

    } catch (error) {
      if (browser) await browser.close();
      console.error("AI Error:", error.message);
      await sock.sendMessage(msg.key.remoteJid, { 
        text: '❌ Gagal mendapatkan jawaban. ChatGPT mungkin mendeteksi bot atau koneksi lambat. Silakan coba lagi.' 
      }, { quoted: msg });
    }
  },
};

// [fix] fitur ai dari chat-gpt ✓
