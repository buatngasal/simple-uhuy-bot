const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function xnxxScraper(query) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // 1. Search via ProxySite
        const searchUrl = `https://www.xnxx.com/search/0-10min/${encodeURIComponent(query)}`;
        await page.goto('https://proxysite.com', { waitUntil: 'domcontentloaded' });
        await page.type('input[name="d"]', searchUrl);
        await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation()]);

        // Get the first video link
        await page.waitForSelector('.thumb-block', { timeout: 20000 });
        const targetUrl = await page.evaluate(() => {
            const firstBlock = document.querySelector('.thumb-block a');
            return firstBlock ? firstBlock.href : null;
        });

        if (!targetUrl) throw new Error("Video not found.");

        // 2. Navigate to video page
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('video.vjs-tech', { timeout: 30000 });

        const videoData = await page.evaluate(() => {
            const v = document.querySelector('video.vjs-tech');
            const titleEl = document.querySelector('.video-title-container strong');
            const metadataEl = document.querySelector('.metadata');
            return {
                src: v ? v.src : null,
                title: titleEl ? titleEl.innerText.trim() : "Tanpa Judul",
                metadata: metadataEl ? metadataEl.innerText.replace(/\s+/g, ' ').trim() : "Tidak ada info",
                pageUrl: window.location.href
            };
        });

        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        const userAgent = await page.evaluate(() => navigator.userAgent);

        return { ...videoData, cookieString, userAgent };
    } finally {
        if (browser) await browser.close();
    }
}

async function downloadVideo(url, outputPath, headers) {
    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        headers: headers
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

module.exports = { xnxxScraper, downloadVideo };
