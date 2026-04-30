const { xnxxScraper, downloadVideo } = require('../../lib/scraper-xnxx');
const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

module.exports = {
    name: 'xnxx',
    description: 'Cari dan download video dari XNXX',
    usage: `${commandPrefix}xnxx <query>`,
    async execute(sock, msg, args) {
        const remoteJid = msg.key.remoteJid;
        const input = args.join(' ');
        const tempDir = path.join(__dirname, '../temp');
        let tempVideoPath = null;

        if (!input) return sock.sendMessage(remoteJid, { text: `*Contoh* : ${commandPrefix}xnxx japanese` }, { quoted: msg });
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        try {
            await sock.sendMessage(remoteJid, { text: `🔍 Mencari: *${input}*...` }, { quoted: msg });

            // Panggil Library Scraper
            const data = await xnxxScraper(input);
            
            await sock.sendMessage(remoteJid, { text: `⏳ Mengunduh: *${data.title}*...` }, { quoted: msg });

            tempVideoPath = path.join(tempDir, `xnxx-${Date.now()}.mp4`);
            
            // Panggil Library Download
            await downloadVideo(data.src, tempVideoPath, {
                'Cookie': data.cookieString,
                'Referer': data.pageUrl,
                'User-Agent': data.userAgent
            });

            const stats = fs.statSync(tempVideoPath);
            if (stats.size > 64 * 1024 * 1024) {
                await sock.sendMessage(remoteJid, { 
                    text: `❌ Ukuran terlalu besar: *${(stats.size/1024/1024).toFixed(2)}MB* (Limit 64MB)` 
                }, { quoted: msg });
            } else {
                await sock.sendMessage(remoteJid, { 
                    video: fs.readFileSync(tempVideoPath), 
                    caption: `🎥 *- X N X X -*\n\n◦ *Judul:* ${data.title}\n◦ *Info:* ${data.metadata}`,
                    mimetype: 'video/mp4'
                }, { quoted: msg });
            }

        } catch (e) {
            console.error(e);
            await sock.sendMessage(remoteJid, { text: `❌ Kesalahan: ${e.message}` }, { quoted: msg });
        } finally {
            if (tempVideoPath && fs.existsSync(tempVideoPath)) {
                fs.unlinkSync(tempVideoPath);
            }
        }
    }
};

// [berhasil] download video dari XNXX dengan kata kunci ✓
