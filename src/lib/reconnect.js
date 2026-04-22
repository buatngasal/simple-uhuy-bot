const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Fungsi untuk melakukan login ulang ke portal WiFi (Self-Healing)
 * @param {string} password - Password wifi Anda
 */
async function autoLoginWifi(password = "bud4m4n1s") { // Password must be in sync with index.js and "./src/lib/reconnect"
    console.log('🌐 [Network] Menjalankan Prosedur Auto-Login Jaringan...');
    
    const browser = await puppeteer.launch({
        headless: "new", // Gunakan "new" agar tidak mengganggu saat bot berjalan
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--ignore-certificate-errors'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Set User Agent agar router tidak memblokir bot
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        // Alamat IP WMS (dapat dilihat melalui ipconfig)
        console.log('🔗 [Network] Menghubungkan ke Gateway 10.89.0.1...');
        await page.goto('http://10.89.0.1', { 
            waitUntil: 'load', 
            timeout: 30000 
        });

        // 1. Tunggu input password (ID: username sesuai gambar)
        await page.waitForSelector('#username', { timeout: 10000 });

        // 2. Ketik password
        await page.type('#username', password);
        console.log('⌨️ [Network] Password dimasukkan.');

        // 3. Klik tombol LOGIN (Class: button-lg)
        await page.click('button.button-lg');
        console.log('🖱️ [Network] Mengklik tombol login...');

        // 4. Jeda untuk memastikan router memproses akses internet
        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log('✅ [Network] Prosedur login selesai.');
        
    } catch (error) {
        console.error('❌ [Network] Gagal auto-login:', error.message);
        
        // Simpan screenshot error jika diperlukan untuk debugging di folder temp
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        await page.screenshot({ path: path.join(tempDir, `reconnect-error-${Date.now()}.png`) }).catch(() => {});
        
    } finally {
        await browser.close();
    }
}

module.exports = { autoLoginWifi };
