const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * ChatGPT Web Scraper
 * @param {string} query - Question for AI
 */
async function aiScraper(query) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        const encodedQuery = encodeURIComponent(query).replace(/%20/g, '+');
        const targetUrl = `https://chatgpt.com/?q=${encodedQuery}`;

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        const selector = '[data-message-author-role="assistant"]';
        await page.waitForSelector(selector, { timeout: 30000 });

        const response = await page.evaluate(async (sel) => {
            const getLatest = () => {
                const nodes = document.querySelectorAll(sel);
                return nodes.length > 0 ? nodes[nodes.length - 1].innerText : null;
            };

            let lastText = "";
            let currentText = getLatest();
            
            for (let i = 0; i < 15; i++) {
                if (currentText && currentText === lastText && currentText.length > 0) break;
                lastText = currentText;
                await new Promise(r => setTimeout(r, 2000)); 
                currentText = getLatest();
            }
            return currentText;
        }, selector);

        await browser.close();
        return response ? response.trim() : null;

    } catch (e) {
        if (browser) await browser.close();
        throw e;
    }
}

module.exports = { aiScraper };
