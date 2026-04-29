const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { commandPrefix } = require('../../../config');

// Gunakan plugin stealth untuk menghindari deteksi bot
puppeteer.use(StealthPlugin());

module.exports = {
  name: 'ss',
  description: 'Tangkapan layar penuh website dengan kualitas tinggi (HD).',
  usage: `${commandPrefix}ss <url>`,
  async execute(sock, msg, args) {
    // Pastikan args adalah string (mengambil elemen pertama jika args adalah array)
    const url = Array.isArray(args) ? args[0] : args;

    if (!url || !url.startsWith('http')) {
      return sock.sendMessage(msg.key.remoteJid, { 
        text: `*Contoh* : ${commandPrefix}ss https://google.com` 
      }, { quoted: msg });
    }

    // Kirim pesan awal
    const { key } = await sock.sendMessage(msg.key.remoteJid, { text: '🔄 Sedang memproses...' }, { quoted: msg });

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Hemat RAM di VPS
          '--disable-gpu',
          '--no-zygote',
          '--single-process' 
        ]
      });

      const page = await browser.newPage();
      
      // Set High Definition Viewport
      await page.setViewport({ 
        width: 1920, 
        height: 1080, 
        deviceScaleFactor: 1.5 // Hasil tajam tanpa membuat file terlalu raksasa
      });

      // Buka URL
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      });

      // Jalankan Auto-Scroll agar Lazy Load (gambar yang muncul saat discroll) ter-render
      await autoScroll(page);

      // Ambil Screenshot Full Page langsung ke Memory (Buffer)
      const screenshotBuffer = await page.screenshot({ 
        fullPage: true, 
        type: 'jpeg', 
        quality: 80 
      });

      await browser.close();

      // Hapus pesan "Sedang memproses" (opsional, tergantung library WA-mu) atau biarkan saja
      // Kirim hasil screenshot
      await sock.sendMessage(msg.key.remoteJid, { 
        image: screenshotBuffer, 
        caption: `✅ *W E B ◦ S S*\n🌐 *URL* : ${url}` 
      }, { quoted: msg });

    } catch (error) {
      console.error('SS Error:', error);
      if (browser) await browser.close();
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `❌ Gagal mengambil screenshot. Website mungkin dilindungi atau koneksi lambat.` 
      }, { quoted: msg });
    }
  },
};

/**
 * Fungsi pembantu untuk scroll otomatis ke bawah halaman
 * Memastikan semua gambar/konten yang baru muncul saat discroll terambil
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 200; // Jarak scroll
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        // Batasi maksimal 8000px untuk menghindari Memory Leak (crash)
        if (totalHeight >= scrollHeight || totalHeight > 8000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// [berhasil] Tangkapan layar satu halaman penuh dengan kualitas HD ✓
