const puppeteer = require('puppeteer');

/**
 * // TikTok scraper using Tikup.me
 * @param {string} url - TikTok video URL
 * @returns {Promise<Object>} - Data video (nickname, username, caption, views, likes, videoUrl)
 */
async function tiktokScraper(url) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1000 });

        let finalVideoUrl = null;
        await page.setRequestInterception(true);
        page.on('request', request => {
            const reqUrl = request.url();
            if (reqUrl.includes('.mp4') || reqUrl.includes('video') || reqUrl.includes('googlevideo')) {
                finalVideoUrl = reqUrl;
            }
            request.continue();
        });

        await page.goto('https://tikup.me', { waitUntil: 'networkidle2' });

        // Input URL
        await page.waitForSelector('input[type="text"]');
        await page.type('input[type="text"]', url);
        await page.click('button[type="submit"]');

        // Wait for data to appear
        await page.waitForSelector('.btn-secondary.w-full', { timeout: 15000 });

        // Extract text data
        const metadata = await page.evaluate(() => {
            const stats = Array.from(document.querySelectorAll('.grid-cols-2 span.font-bold'));
            return {
                nickname: document.querySelector('h3')?.innerText || 'Unknown',
                username: document.querySelector('h3 + p')?.innerText || 'Unknown',
                caption: document.querySelector('p.line-clamp-2, p.line-clamp-3, p.text-left')?.innerText || '-',
                views: stats[0]?.innerText || '0',
                likes: stats[1]?.innerText || '0'
            };
        });

        // Trigger Download Link
        await page.click('.btn-secondary.w-full');

        let retry = 0;
        while (!finalVideoUrl && retry < 15) {
            await new Promise(r => setTimeout(r, 1000));
            retry++;
        }

        if (!finalVideoUrl) throw new Error("Failed to get video download link.");

        return { ...metadata, videoUrl: finalVideoUrl };

    } catch (e) {
        throw e;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { tiktokScraper };
