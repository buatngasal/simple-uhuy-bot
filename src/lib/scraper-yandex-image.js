const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function yandexImage(query) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        
        const url = `https://yandex.com/images/search?from=tabbar&text=${encodeURIComponent(query)}&family=yes`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        const imageSelector = '.SerpItem-Thumb';
        await page.waitForSelector(imageSelector, { timeout: 15000 });

        const images = await page.$$(imageSelector);
        if (images.length === 0) throw new Error('Gambar tidak ditemukan');

        // Pick random from first 5 results
        const randomIndex = Math.floor(Math.random() * Math.min(images.length, 5));
        await images[randomIndex].click();
        
        const hdImageSelector = 'img.canvas-card__image, img.MMImage-Origin';
        await page.waitForSelector(hdImageSelector, { timeout: 10000 });

        const imageUrl = await page.evaluate((sel) => {
            const img = document.querySelector(sel);
            return img ? img.src : null;
        }, hdImageSelector);

        if (!imageUrl) throw new Error('Failed to get HD image URL');

        // Get image data as Buffer to avoid saving temporary files in the library
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        
        await browser.close();
        return Buffer.from(response.data, 'binary');

    } catch (error) {
        if (browser) await browser.close();
        throw error;
    }
}

module.exports = { yandexImage };
