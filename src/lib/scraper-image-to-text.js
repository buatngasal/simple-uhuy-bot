const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const getRandomUA = () => {
    const uas = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ];
    return uas[Math.floor(Math.random() * uas.length)];
};

/**
 * Function to process image to text via imagetotext.info
 * @param {String} filePath - Temp image file path
 * @returns {Promise<String>} - OCR text result
 */
async function scraperImageToText(filePath) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent(getRandomUA());
        
        await page.goto('https://imagetotext.info', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // Upload File
        await page.waitForSelector('input#file');
        const inputHandle = await page.$('input#file');
        await inputHandle.uploadFile(filePath);

        // Handle conversion click
        await page.waitForSelector('#jsShadowRoot', { visible: true, timeout: 20000 });
        await page.click('#jsShadowRoot');

        // Delay for 5 seconds to await results
        const resultSelector = 'textarea.img-text';
        await page.waitForSelector(resultSelector, { timeout: 60000 });
        await new Promise(res => setTimeout(res, 5000));

        const rawText = await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            return element ? element.value : null;
        }, resultSelector);

        if (!rawText) return "Text not found.";

        // Clean up text
        return rawText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '')
            .join('\n');

    } catch (error) {
        throw new Error(`Scraper Error: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { scraperImageToText };
