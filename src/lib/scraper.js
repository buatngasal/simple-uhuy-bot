const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Scraper untuk ChatGPT (Web Version)
 * @param {string} query - Pertanyaan untuk AI
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

        // Tunggu sampai teks berhenti berubah (selesai streaming/mengetik)
        const response = await page.evaluate(async (sel) => {
            const getLatest = () => {
                const nodes = document.querySelectorAll(sel);
                return nodes.length > 0 ? nodes[nodes.length - 1].innerText : null;
            };

            let lastText = "";
            let currentText = getLatest();
            
            for (let i = 0; i < 15; i++) { // Max loop 15 kali
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

/**
 * Scraper untuk Lirik ChordTela
 * @param {string} query - Judul lagu
 */
async function lyricsScraper(query) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        const searchUrl = `https://www.chordtela.com/chord-kunci-gitar-dasar-hasil-pencarian?q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        await new Promise(r => setTimeout(r, 3000));
        const firstResultUrl = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a.gs-title, .gsc-result a'));
            const validLink = links.find(a => {
                const href = a.href || "";
                return href.includes('chordtela.com') && !href.includes('/p/daftar-isi.html') && !href.includes('pencarian');
            });
            return validLink ? validLink.href : null;
        });

        if (!firstResultUrl) return null;

        await page.goto(firstResultUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('pre', { timeout: 15000 });

        const data = await page.evaluate(() => {
            const title = document.querySelector('.entry-title')?.innerText.trim() || 'Lirik Lagu';
            const rawContent = document.querySelector('pre')?.innerText || '';

            let cleanLines = rawContent.split('\n').map(line => {
                const chordLinePattern = /^[ \t]*([A-G][b#]?(2|4|5|6|7|9|11|13|maj|min|m|sus|add|dim|aug|[\d])?([ \t/+-]+|$))+[ \t]*$/g;
                if (chordLinePattern.test(line)) return ""; 
                return line.replace(/\b([A-G][b#]?(2|4|5|6|7|9|11|13|maj|min|m|sus|add|dim|aug)?(\/[A-G][b#]?)?)\b/g, '').trim();
            });

            let content = cleanLines.filter(l => l.length > 1 && !/^(Intro|Musik|Outro|Reff|Bridge)/i.test(l)).join('\n');
            return { title, content };
        });

        await browser.close();
        return data;
    } catch (e) {
        if (browser) await browser.close();
        throw e;
    }
}

module.exports = { 
    aiScraper, 
    lyricsScraper 
};
