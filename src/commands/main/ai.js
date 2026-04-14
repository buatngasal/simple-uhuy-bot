const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const Tesseract = require('tesseract.js');
const path = require('path');
const { commandPrefix } = require('../../../config');

// Gunakan plugin stealth
puppeteer.use(StealthPlugin());

module.exports = {
  name: 'ai',
  description: 'Tanya AI via ChatGPT',
  usage: `${commandPrefix}ai <pertanyaan>`,
  async execute(sock, msg, args) {
    if (!args.length) {
      return sock.sendMessage(msg.key.remoteJid, { 
        text: `Masukkan pertanyaan.\nContoh: ${commandPrefix}ai apa itu cinta?` 
      }, { quoted: msg });
    }

    // Menggabungkan argumen dan encode untuk URL
    const query = args.join(' ');
    const encodedQuery = encodeURIComponent(query).replace(/%20/g, '+');
    const targetUrl = ` https://chatgpt.com/?q=${encodedQuery}`;

    await sock.sendMessage(msg.key.remoteJid, { text: '🤖 Sedang memproses jawaban...' }, { quoted: msg });

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      // Set Viewport Desktop
      await page.setViewport({ width: 3840, height: 2160 });

      // Buka URL ChatGPT dengan query
      await page.goto(targetUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 90000
      });

      // Tunggu render jawaban (ChatGPT butuh waktu mengetik)
      // Kita beri jeda 10-15 detik agar jawaban selesai muncul
      await new Promise(resolve => setTimeout(resolve, 15000)); 

      // Ambil screenshot area jawaban saja (Clip disesuaikan dengan layout umum)
      const imageBuffer = await page.screenshot({ 
        type: 'png',
        clip: {
          x: 1470,      // Menghindari sidebar kiri
          y: 100,       // Menghindari header
          width: 1200,  // Lebar konten tengah
          height: 1750  // Tinggi area teks
        }
      });

      await browser.close();

      // --- PROSES OCR (Ubah Gambar ke Teks) ---
      const { data: { text } } = await Tesseract.recognize(
        imageBuffer,
        'ind+eng',
        { 
          cachePath: path.join(__dirname, '../temp'), // Simpan data bahasa di folder temp
          logger: m => console.log(`[OCR Status] ${m.status}: ${Math.round(m.progress * 100)}%`)
        }
      );

      if (!text || text.trim().length < 5) {
        return sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ Gagal membaca jawaban. Coba ulangi beberapa saat lagi.' 
        }, { quoted: msg });
      }

      // Kirim hasil akhir berupa teks
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `${text.trim()}` 
      }, { quoted: msg });

    } catch (error) {
      console.error('AI Error:', error);
      if (browser) await browser.close();
      await sock.sendMessage(msg.key.remoteJid, { 
        text: '❌ Terjadi kesalahan teknis atau akses diblokir oleh sistem AI.' 
      }, { quoted: msg });
    }
  },
};

// [fix] fitur ai dari chat-gpt
