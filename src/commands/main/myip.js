const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { formatError } = require('../../lib/response-helper');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'myip',
  description: 'Menampilkan informasi detail alamat IP beserta peta lokasi',
  async execute(sock, msg, args) {
    const url = 'http://ip-api.com/json';
    let tempMapPath = null;
    let browser = null;

    try {
      // 1. Ambil data IP
      const response = await axios.get(url);
      const data = response.data;

      if (data.status !== 'success') {
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: formatError('Gagal', 'Data IP tidak ditemukan.') 
        }, { quoted: msg });
      }

      // 2. Beri info sedang memproses (opsional)
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Mengambil informasi dan map...' }, { quoted: msg });

      // 3. Proses Screenshot Peta menggunakan Puppeteer
      const mapUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(data.city)}#map=13/${data.lat}/${data.lon}`;
      
      const tempDir = path.join(__dirname, '../temp'); // Pastikan path temp sesuai struktur foldermu
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      tempMapPath = path.join(tempDir, `map-${Date.now()}.png`);

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 900 }); // Naikkan viewport agar area render lebih luas
      await page.goto(mapUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // 1. Tunggu container peta muncul
      const mapSelector = '#map'; 
      await page.waitForSelector(mapSelector, { timeout: 15000 });

      // 2. Beri jeda sedikit agar tile peta termuat sempurna (mencegah kotak abu-abu)
      await new Promise(r => setTimeout(r, 2000));

      // 3. Cari elemen peta dan ambil koordinat kotaknya (Bounding Box)
      const mapElement = await page.$(mapSelector);
      
      // 4. Lakukan screenshot hanya pada elemen tersebut (CROP OTOMATIS)
      await mapElement.screenshot({ 
        path: tempMapPath,
        // Ini akan memotong gambar hanya di area peta sesuai selector #map
      });

      await browser.close();

      // 4. Susun Caption
      const caption = `*🌐 INFORMASI ALAMAT IP 🌐*

📍 *IP Address:* ${data.query}
🏢 *ISP:* ${data.isp}
🌍 *Negara:* ${data.country} (${data.countryCode})
🏙️ *Kota:* ${data.city}
📮 *Kode Pos:* ${data.zip}
🧭 *Koordinat:* ${data.lat}, ${data.lon}
⏰ *Timezone:* ${data.timezone}
📡 *Organisasi:* ${data.org}

_Peta berdasarkan koordinat OpenStreetMap_`;

      // 5. Kirim Gambar + Caption
      const imageBuffer = fs.readFileSync(tempMapPath);
      await sock.sendMessage(
        msg.key.remoteJid,
        { 
            image: imageBuffer, 
            caption: caption 
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error('MyIP Error:', e);
      if (browser) await browser.close();
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: 'Error: Gagal mengambil data. ' + (e.message || '') },
        { quoted: msg }
      );
    } finally {
      // Hapus file temporary setelah dikirim
      if (tempMapPath && fs.existsSync(tempMapPath)) {
        try { fs.unlinkSync(tempMapPath); } catch (err) {}
      }
    }
  }
};

// [fix] fitur my ip dengan gambar peta ✓
