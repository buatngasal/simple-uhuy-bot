const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { formatError } = require('../../lib/response-helper');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'fast',
  description: 'Cek kecepatan internet via Fast.com (Direct atau Proxy)',
  async execute(sock, msg, args) {
    const argsArray = Array.isArray(args) ? args : (args ? args.split(' ') : []);
    const isProxy = argsArray.includes('proxy');
    
    let browser = null;

    try {
      const statusMsg = `🚀 *Menjalankan Speedtest ${isProxy ? 'via Proxyium' : 'secara Langsung'}...*\n_Mohon tunggu sekitar 1 menit..._`;
      await sock.sendMessage(msg.key.remoteJid, { text: statusMsg }, { quoted: msg });

      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--window-size=1280,800'
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      
      // Set User Agent agar tidak terdeteksi bot
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

      if (isProxy) {
        // --- MODE PROXYIUM ---
        await page.goto('https://proxyium.com', { waitUntil: 'networkidle2', timeout: 60000 });
        const inputSelector = '#unique-form-control';
        await page.waitForSelector(inputSelector, { visible: true });
        await page.type(inputSelector, 'https://fast.com', { delay: 50 });
        await page.click('#unique-btn-blue');
      } else {
        // --- MODE DIRECT ---
        await page.goto('https://fast.com', { waitUntil: 'networkidle2', timeout: 60000 });
      }

      // 1. Tunggu hasil utama (Download) selesai
      console.log("Menunggu download selesai...");
      await page.waitForSelector('.speed-results-container.succeeded', { visible: true, timeout: 60000 });

      // 2. Klik "Show more info" untuk mendapatkan Upload & Ping
      const showMoreBtn = '#show-more-details-link';
      await page.waitForSelector(showMoreBtn, { visible: true });
      await page.click(showMoreBtn);

      // 3. Tunggu hingga proses Upload & Detail Lokasi benar-benar termuat
      console.log("Menunggu detail upload dan lokasi...");
      try {
        await page.waitForFunction(
          () => {
            const uploadOk = document.querySelector('#extra-details-container.succeeded');
            const isp = document.querySelector('#user-isp')?.innerText;
            const loc = document.querySelector('#user-location')?.innerText;
            const serv = document.querySelector('#server-locations')?.innerText;
            
            // Pastikan data bukan 'Unknown', 'Searching', atau kosong
            return uploadOk && 
                   isp && isp.length > 3 && 
                   loc && loc.length > 3 && 
                   serv && serv.length > 3;
          },
          { timeout: 30000 } // Beri waktu 30 detik ekstra untuk render detail
        );
      } catch (e) {
        console.log("Beberapa detail gagal dimuat tepat waktu, mengambil data seadanya.");
      }

      // 4. Ambil semua data dari DOM
      const data = await page.evaluate(() => {
        const getTxt = (sel) => document.querySelector(sel)?.innerText?.trim() || 'Unknown';
        return {
          download: getTxt('#speed-value'),
          unit: getTxt('#speed-units'),
          upload: getTxt('#upload-value'),
          uploadUnit: getTxt('#upload-units'),
          ping: getTxt('#latency-value'),
          jitter: getTxt('#bufferbloat-value'),
          clientIp: getTxt('#user-ip'),
          clientLoc: getTxt('#user-location'),
          clientIsp: getTxt('#user-isp'),
          server: getTxt('#server-locations')
        };
      });

      // 5. Ambil Screenshot hasil sebagai bukti visual
      const screenshot = await page.screenshot({ fullPage: false });

      // 6. Susun Pesan WhatsApp
      let resMsg = `✅ *FAST.COM FULL REPORT*\n\n`;
      resMsg += `*• Download* : ${data.download} ${data.unit}\n`;
      resMsg += `*• Upload*   : ${data.upload} ${data.uploadUnit}\n`;
      resMsg += `*• Latency* : ${data.ping} ms (Jitter: ${data.jitter}ms)\n\n`;
      resMsg += `*• ISP*      : ${data.clientIsp}\n`;
      resMsg += `*• IP*       : ${data.clientIp}\n`;
      resMsg += `*• Lokasi*   : ${data.clientLoc}\n`;
      resMsg += `*• Server*   : ${data.server}\n\n`;
      resMsg += `_Method: ${isProxy ? 'Proxyium Tunnel' : 'Direct Connection'}_`;

      // 7. Kirim dengan format externalAdReply
      await sock.sendMessage(msg.key.remoteJid, {
        text: resMsg,
        contextInfo: {
          externalAdReply: {
            title: `Internet Speed: ${data.download} ${data.unit}`,
            body: `Upload: ${data.upload} ${data.uploadUnit} | Ping: ${data.ping}ms`,
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: true,
            thumbnail: screenshot, 
            sourceUrl: "https://fast.com"
          }
        }
      }, { quoted: msg });

    } catch (e) {
      console.error('Fast Error:', e);
      await sock.sendMessage(msg.key.remoteJid, { 
        text: formatError('Speedtest Error', e.message || 'Gagal mengambil data.') 
      }, { quoted: msg });
    } finally {
      if (browser) await browser.close();
    }
  }
};

// [berhasil] fitur untuk cek kecepatan internet via fast.com (direct atau proxy) ✓
