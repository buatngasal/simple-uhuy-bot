const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const sharp = require('sharp');

puppeteer.use(StealthPlugin());

async function instagramDownloader(url) {
  let browser = null;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent(userAgent);

    // 1. Navigate to site
    await page.goto('https://snapinsta.to', { waitUntil: 'networkidle2' });

    // 2. Enter URL & click download
    await page.waitForSelector('#s_input');
    await page.type('#s_input', url);
    await page.click('button.btn-default');

    // 3. Wait for process & handle ads (Use manual delay if selectors are delayed)
    await new Promise(resolve => setTimeout(resolve, 5000)); 

    // Find download button (using a broader selector)
    const downloadBtnSelector = 'a[href*="dl.php"], .download-items__btn a, a.btn-download';
    
    try {
      await page.waitForSelector(downloadBtnSelector, { timeout: 15000 });
    } catch (e) {
      // If it fails, try closing the ad modal that might be blocking
      await page.evaluate(() => {
        const closeButtons = document.querySelectorAll('button, span, i');
        closeButtons.forEach(el => {
          if (el.innerText.includes('Close') || el.innerText.includes('Tutup') || el.id.includes('close')) {
            el.click();
          }
        });
      });
      // Capture debug screenshot for manual inspection if it still fails
      await page.screenshot({ path: 'debug_error.png' });
      throw new Error('Failed to find download button. Cek debug_error.png');
    }

    // 4. Extract download URL
    const data = await page.evaluate((sel) => {
      const btn = document.querySelector(sel);
      if (!btn) return null;
      return {
        url: btn.href,
        isPhoto: btn.innerText.toLowerCase().includes('photo') || btn.innerText.toLowerCase().includes('foto')
      };
    }, downloadBtnSelector);

    if (!data || !data.url) throw new Error('Invalid download URL');

    // 5. Download file using Axios (Use full headers to avoid 403)
    const res = await axios.get(data.url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': userAgent,
        'Referer': 'https://snapinsta.to',
        'Accept': '*/*'
      }
    });

    await browser.close();

    let buffer = Buffer.from(res.data, 'binary');
    if (data.isPhoto) {
      buffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();
      return { buffer, type: 'image' };
    }
    return { buffer, type: 'video' };

  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}

module.exports = { instagramDownloader };
