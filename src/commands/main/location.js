const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { formatError } = require('../../lib/response-helper');

puppeteer.use(StealthPlugin());

module.exports = {
  name: 'location',
  description: 'Track IP details (Regular, Proxy, or Specific IP)',
  async execute(sock, msg, args) {
    // Args treated as an array
    const argsArray = Array.isArray(args) ? args : (args ? args.split(' ') : []);
    const isProxy = argsArray.includes('proxy');
    // Search for IP input in array
    const targetIp = argsArray.find(arg => arg !== 'proxy' && arg.includes('.')) || '';
    
    const targetApiUrl = `http://ip-api.com/json/${targetIp}`;
    let data = null;
    let browser = null;

    try {
      const statusMsg = `🔍 *Tracking ${targetIp || 'Current'} IP ${isProxy ? 'via Proxy' : 'directly'}...*`;
      await sock.sendMessage(msg.key.remoteJid, { text: statusMsg }, { quoted: msg });

      if (isProxy) {
        // --- MODE PROXY (PUPPETEER) ---
        browser = await puppeteer.launch({
          headless: "new",
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('https://proxysite.com', { waitUntil: 'networkidle2' });
        
        await page.waitForSelector('input[name="d"]');
        await page.type('input[name="d"]', targetApiUrl);
        
        await Promise.all([
          page.click('button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        const rawData = await page.evaluate(() => document.body.innerText);
        data = JSON.parse(rawData);
      } else {
        // --- DIRECT MODE (AXIOS) ---
        const response = await axios.get(targetApiUrl);
        data = response.data;
      }

      if (!data || data.status !== 'success') {
        throw new Error(data.message || 'Failed to retrieve IP data.');
      }

      // 1. Send Location Pin
      const sentLocation = await sock.sendMessage(msg.key.remoteJid, {
        location: { 
          degreesLatitude: data.lat, 
          degreesLongitude: data.lon,
          name: `${data.city}, ${data.country}`,
          address: `${data.query}`
        }
      }, { quoted: msg });

      // 2. Format English Caption
      let caption = `🌐 *- I N F O R M A T I O N -*\n\n`;
      caption += `*• IP Address* : ${data.query}\n`;
      caption += `*• Country* : ${data.country} (${data.countryCode})\n`;
      caption += `*• City* : ${data.city}\n`;
      caption += `*• ZIP Code* : ${data.zip}\n`;
      caption += `*• Timezone* : ${data.timezone}\n`;
      caption += `*• ISP* : ${data.isp}\n`;
      caption += `*• ASN* : ${data.as}\n\n`;
      
      caption += `_Method: ${isProxy ? 'Proxy Tunnel' : 'Direct Request'}_`;

      // 3. Reply to location with details
      await sock.sendMessage(msg.key.remoteJid, { text: caption }, { quoted: sentLocation });

    } catch (e) {
      console.error('Location Error:', e);
      await sock.sendMessage(msg.key.remoteJid, { 
        text: formatError('Error', e.message || 'An unexpected error occurred.') 
      }, { quoted: msg });
    } finally {
      if (browser) await browser.close();
    }
  }
};

// [berhasil] track IP details (regular, proxy, or specific IP) ✓
