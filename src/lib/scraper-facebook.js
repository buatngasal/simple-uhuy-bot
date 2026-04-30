const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function facebookDownloader(urlInput) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        await page.goto('https://snapsave.app', { waitUntil: 'networkidle2' });

        await page.waitForSelector('#url');
        await page.type('#url', urlInput);
        await page.click('#send');

        // Wait for the results table to appear
        await page.waitForSelector('table.table.is-fullwidth', { timeout: 30000 });

        const videoData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table.table.is-fullwidth tbody tr'));
            let fallbackLink = null;

            for (let row of rows) {
                const columns = row.querySelectorAll('td');
                if (columns.length < 3) continue;

                const quality = columns[0].innerText.trim();
                const renderStatus = columns[1].innerText.trim().toLowerCase();
                const downloadBtn = columns[2].querySelector('a');

                if (downloadBtn && downloadBtn.href.startsWith('http')) {
                    const data = { quality, link: downloadBtn.href };
                    if (!fallbackLink) fallbackLink = data;

                    // Priority: skip re-rendering
                    if (renderStatus === 'tidak' || renderStatus.includes('no')) {
                        return data;
                    }
                }
            }
            return fallbackLink;
        });

        return videoData;
    } catch (error) {
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { facebookDownloader };
