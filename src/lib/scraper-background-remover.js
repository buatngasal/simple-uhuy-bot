const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const sharp = require('sharp');

puppeteer.use(StealthPlugin());

/**
 * Picsart Background Remover Scraper
 * @param {String} inputPath - Path to the original image file
 * @returns {Promise<Buffer>} - Transparent PNG image Buffer
 */
async function removeBG(inputPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

    await page.goto('https://picsart.com/background-remover/', { waitUntil: 'networkidle2', timeout: 60000 });

    // Skip cookie banner
    try {
      await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 5000 });
      await page.click('#onetrust-accept-btn-handler');
    } catch (e) {}

    // Upload to Input
    const fileInput = 'input[type="file"][data-testid="input"]';
    await page.waitForSelector(fileInput, { timeout: 20000 });
    const inputHandle = await page.$(fileInput);
    await inputHandle.uploadFile(inputPath);

    // Wait for AI processing (12s to ensure canvas is fully rendered)
    await new Promise(r => setTimeout(r, 12000)); 

    // Extract data from canvas
    const canvasData = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? canvas.toDataURL('image/png') : null;
    });

    if (!canvasData) throw new Error("Gagal mengambil data dari canvas.");

    // Convert Base64 to Buffer & process with Sharp for transparency
    const rawBuffer = Buffer.from(canvasData.split(',')[1], 'base64');
    const processedBuffer = await sharp(rawBuffer)
      .ensureAlpha()
      .png()
      .toBuffer();

    return processedBuffer;

  } catch (error) {
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { removeBG };
