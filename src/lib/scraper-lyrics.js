const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * ChordTela Lyrics Scraper - Enhanced Version
 * Focus on stripping chords and music structure from lyrics
 */
async function lyricsScraper(query) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Setup User-Agent to bypass bot detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        const searchUrl = `https://www.chordtela.com/chord-kunci-gitar-dasar-hasil-pencarian?q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for Google Custom Search to load results
        await page.waitForSelector('.gsc-result', { timeout: 10000 }).catch(() => null);

        const firstResultUrl = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a.gs-title, .gsc-webResult a.gs-title'));
            const validLink = links.find(a => {
                const href = a.href || "";
                return href.includes('chordtela.com') && !href.includes('/p/') && !href.includes('pencarian');
            });
            return validLink ? validLink.href : null;
        });

        if (!firstResultUrl) return null;

        await page.goto(firstResultUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('pre', { timeout: 15000 });

        const data = await page.evaluate(() => {
            const titleElement = document.querySelector('.entry-title');
            const title = titleElement ? titleElement.innerText.replace(/Chord|Kunci Gitar|Dasar|Lirik/gi, '').trim() : 'Lirik Lagu';
            
            const rawContent = document.querySelector('pre')?.innerText || '';

            // 1. Regex to detect lines containing ONLY chords (with spaces/special characters)
            const isChordLine = (line) => {
                const chordPattern = /^[A-G][b#]?(2|4|5|6|7|9|11|13|maj|min|m|sus|add|dim|aug|[\d])?(\/[A-G][b#]?)?(\s+|$|[.\-()]+)/;
                const tokens = line.trim().split(/\s+/);
                // If more than 60% of tokens in a line are chords, treat it as a chord line
                const chordCount = tokens.filter(t => chordPattern.test(t)).length;
                return chordCount > 0 && chordCount / tokens.length > 0.5;
            };

            // 2. Regex to remove inline chords from lyric lines
            const inlineChordRegex = /\b[A-G][b#]?(m|maj|dim|aug|sus)?\d?(\/[A-G][b#]?)?\b/g;

            let lines = rawContent.split('\n');
            let cleanLyrics = lines
                .map(line => {
                    // Filter out chord-only lines
                    if (isChordLine(line)) return null;

                    // Strip section headers (Intro, Chorus, Bridge)
                    if (/^(Intro|Musik|Outro|Reff|Chorus|Bridge|Interlude|Ending|Vokal)/i.test(line.trim())) return null;

                    // Remove inline chords and normalize whitespace
                    return line.replace(inlineChordRegex, '').replace(/\s+/g, ' ').trim();
                })
                .filter(line => line !== null && line.length > 2); // Only keep non-empty lines

            return {
                title: title,
                content: cleanLyrics.join('\n')
            };
        });

        await browser.close();
        return data;
    } catch (e) {
        if (browser) await browser.close();
        console.error("Scraper Error:", e.message);
        return null;
    }
}

module.exports = { lyricsScraper };
