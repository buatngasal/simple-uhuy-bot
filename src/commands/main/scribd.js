const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { PDFDocument } = require('pdf-lib');
const { commandPrefix } = require('../../../config');

puppeteer.use(StealthPlugin());

const STRICT_PAGE_LIMIT = 9;

module.exports = {
    name: 'scribd',
    description: 'Download Dokumen Scribd via URL (Limit 9 Halaman)',
    async execute(sock, msg, args) {
        const remoteJid = msg?.key?.remoteJid;
        if (!remoteJid) return;

        let url = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
        // SCRIBD URL FILTER
        const scribdRegex = /^(https?:\/\/)?(www\.|id\.)?scribd\.com\/.+/i;
        if (!url || !scribdRegex.test(url)) {
            return sock.sendMessage(remoteJid, { 
                text: `*Contoh* : ${commandPrefix}scribd https://www.scribd.com/document/7797665/Ayat-ayat-cinta-Review` 
            }, { quoted: msg });
        }

        let browser = null;
        try {
            await sock.sendMessage(remoteJid, { text: `⏳ Mengecek dokumen...` }, { quoted: msg });

            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1200, height: 1600 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const docInfo = await page.evaluate(() => {
                const totalNode = document.querySelector('div[data-e2e="total-pages"]') || document.querySelector('.3dwpfv');
                return {
                    total: totalNode ? parseInt(totalNode.innerText.replace(/[^0-9]/g, '')) : 0,
                    title: document.title.replace(' | Scribd', '').replace(/[\\/:*?"<>|]/g, '')
                };
            });

            if (docInfo.total > STRICT_PAGE_LIMIT) {
                await browser.close();
                return sock.sendMessage(remoteJid, { text: `❌ Maksimal limit adalah ${STRICT_PAGE_LIMIT} halaman.` }, { quoted: msg });
            }

            // 2. Pre-render (Pancing Cache)
            await sock.sendMessage(remoteJid, { text: `🔄 Memproses dokumen (${docInfo.total} hal)...` }, { quoted: msg });
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    let distance = 800;
                    let timer = setInterval(() => {
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= document.body.scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 200);
                });
            });
            await page.evaluate(() => window.scrollTo(0, 0));
            await new Promise(r => setTimeout(r, 2000));

            // 3. Masuk Full Screen & Bersihkan UI
            try {
                await page.click('button[data-e2e="full-screen-icon"]');
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {}

            await page.evaluate(() => {
                const hide = ['header', 'footer', '.global_header', '.doc_reader_toolbar', '[data-e2e="doc-reader-toolbar"]', '[data-e2e="full-screen-footer"]'];
                hide.forEach(s => document.querySelectorAll(s).forEach(el => el.style.display = 'none'));
            });

            const pdfDoc = await PDFDocument.create();
            // Selector diurutkan dari yang paling spesifik (per halaman)
            const pageSelector = '.paper_page, div[data-page-number], .outer_page_container';
            const btnNextSelector = 'div[class*="1Bw2N"] button:last-child';

            // 4. Proses Screenshot
            for (let i = 0; i < docInfo.total; i++) {
                const currentPages = await page.$$(pageSelector);
                
                if (currentPages[i]) {
                    await currentPages[i].scrollIntoView();
                    
                    await page.waitForFunction((el) => {
                        const img = el.querySelector('img');
                        return img && img.complete && img.naturalWidth > 10;
                    }, { timeout: 10000 }, currentPages[i]).catch(() => null);

                    await new Promise(r => setTimeout(r, 2000));

                    const screenshot = await currentPages[i].screenshot({ type: 'jpeg', quality: 90 });
                    const img = await pdfDoc.embedJpg(screenshot);
                    
                    // Membuat halaman PDF baru untuk setiap screenshot
                    const pdfPage = pdfDoc.addPage([img.width, img.height]);
                    pdfPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
                }

                if (i < docInfo.total - 1) {
                    try {
                        await page.click(btnNextSelector);
                        await new Promise(r => setTimeout(r, 1000));
                    } catch (e) {
                        await page.evaluate(() => window.scrollBy(0, 1000));
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            await sock.sendMessage(remoteJid, {
                document: Buffer.from(pdfBytes),
                mimetype: 'application/pdf',
                fileName: `${docInfo.title}.pdf`,
                caption: `📗 *- S C R I B D -*\n\n◦ *Judul* : ${docInfo.title}\n◦ *Total* : ${docInfo.total} Halaman.`
            }, { quoted: msg });

        } catch (err) {
            console.error(err);
            await sock.sendMessage(remoteJid, { text: `❌ Gagal: ${err.message}` }, { quoted: msg });
        } finally {
            if (browser) await browser.close();
        }
    }
};

// [berhasil] fitur untuk mendownload dokumen dari scribd ✓
