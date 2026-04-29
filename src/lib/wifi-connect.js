const puppeteer = require('puppeteer');
const wifi = require('node-wifi');
const dns = require('dns').promises;

wifi.init({ iface: null });

// Global variable to count successful checks
let activeCheckCounter = 0;

async function checkInternet() {
    try {
        // DNS check to Google or Cloudflare to validate active internet
        await dns.lookup('google.com');
        return true;
    } catch {
        return false;
    }
}

async function autoLoginWifi(targetSSID, passwordPortal) {
    try {
        const online = await checkInternet();

        if (online) {
            activeCheckCounter++;
            console.log(`✅ [Network] Internet is active (${activeCheckCounter}/3).`);

            // If online 3 times in a row, force portal login to refresh
            if (activeCheckCounter < 3) {
                return;
            } else {
                console.log('🔄 [Network] Threshold reached. Forced checking portal: http://10.89.0');
                activeCheckCounter = 0; 
            }
        } else {
            // Reset counter if internet is down to restart the cycle
            activeCheckCounter = 0;
        }

        console.log(`🌐 [Network] Connecting to: ${targetSSID}`);
        await wifi.connect({ ssid: targetSSID });
        await new Promise(r => setTimeout(r, 5000));

        const browser = await puppeteer.launch({
            headless: "new", // Set to false to see the process visually
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        // OPTIMIZATION: Use the automatically opened tab on launch (prevent blank tabs)
        const pages = await browser.pages();
        const page = pages[0]; 
        
        try {
            console.log('🔗 [Network] Navigating to portal...');
            
            try {
                await page.goto('http://10.89.0.1', { waitUntil: 'networkidle2', timeout: 20000 });
            } catch (e) {
                if (await checkInternet()) {
                    console.log('✅ [Network] Portal timeout, but internet is actually active.');
                    return;
                }
                throw e;
            }

            // Detect login status based on page text or elements
            const isAlreadyLoggedIn = await page.evaluate(() => {
                const bodyText = document.body.innerText.toLowerCase();
                return bodyText.includes('login berhasil') || 
                       bodyText.includes('anda terhubung') ||
                       !!document.querySelector('button.logout') || 
                       !!document.querySelector('a[href*="logout"]');
            });

            if (isAlreadyLoggedIn) {
                console.log('✅ [Network] Session is already active on portal page.');
            } else {
                console.log('🔑 [Network] New Session: Inputting password...');
                // Ensure the #username selector matches the ID on your portal
                await page.waitForSelector('#username', { timeout: 10000 });
                await page.type('#username', passwordPortal);
                await page.click('button.button-lg');
                
                await new Promise(r => setTimeout(r, 5000));
                console.log('✅ [Network] Login form submitted successfully.');
            }

        } finally {
            // Always close browser to save RAM
            await browser.close();
        }
    } catch (error) {
        if (!(await checkInternet())) {
            console.error(`❌ [Error] Failed at WiFi/Portal stage: ${error.message}`);
        } else {
            console.log('✅ [Network] Process completed with bypass.');
        }
    }
}

module.exports = { autoLoginWifi };
