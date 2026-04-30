const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const fs = require('fs');

puppeteer.use(StealthPlugin());

/**
 * Picsart Image Enhancer Scraper
 * @param {Buffer|String} image - Image buffer or file path
 * @returns {Promise<Buffer>} - HD result image buffer
 */
async function picsartHD(imageSource) {
    let browser;
    let tempPath = `./temp_hd_${Date.now()}.jpg`;

    try {
        // Write buffer to temporary file if input is a Buffer
        if (Buffer.isBuffer(imageSource)) {
            fs.writeFileSync(tempPath, imageSource);
        } else {
            tempPath = imageSource;
        }

        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });
        await page.goto('https://picsart.com/ai-image-enhancer/', { waitUntil: 'networkidle2', timeout: 60000 });

        // Handle Cookie
        try {
            await page.waitForSelector('button#onetrust-accept-btn-handler', { timeout: 3000 });
            await page.click('button#onetrust-accept-btn-handler');
        } catch (e) {}

        // Upload
        const fileInput = 'input[type="file"]';
        await page.waitForSelector(fileInput);
        const inputHandle = await page.$(fileInput);
        await inputHandle.uploadFile(tempPath);

        // Wait for process to complete
        await page.waitForFunction(
            () => !document.body.innerText.includes('Applying the result'),
            { timeout: 120000, polling: 1000 }
        );

        const imageSelector = 'div[class*="Result-root"] img, [data-testid="EnhancedImage"] img';
        await page.waitForSelector(imageSelector, { timeout: 30000 });
        await new Promise(r => setTimeout(r, 5000));

        const imageUrl = await page.evaluate((sel) => {
            const img = document.querySelector(sel);
            return img && img.src.startsWith('http') ? img.src : null;
        }, imageSelector);

        if (!imageUrl) throw new Error("Failed to get image URL");

        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);

    } catch (error) {
        throw error;
    } finally {
        if (browser) await browser.close();
        if (fs.existsSync(tempPath) && tempPath.includes('temp_hd_')) fs.unlinkSync(tempPath);
    }
}

module.exports = { picsartHD };
