const axios = require('axios');
const { tiktokScraper } = require('../../lib/scraper-tiktok');
const { commandPrefix } = require('../../../config');

module.exports = {
    name: 'tt',
    description: 'Download TikTok via Library Scraper',
    usage: `${commandPrefix}tt <tiktok_url>`,
    async execute(sock, msg, args) {
        const url = args[0];

        // Validasi URL
        const tiktokRegex = /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.*$/i;
        if (!url || !tiktokRegex.test(url)) {
            return await sock.sendMessage(msg.key.remoteJid, { 
                text: `*Contoh* : ${commandPrefix}tt https://www.tiktok.com/@idgitaf/video/7515030156914806034` 
            }, { quoted: msg });
        }

        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang memproses link tiktok...' }, { quoted: msg });

        try {
            // Memanggil fungsi dari library
            const data = await tiktokScraper(url);

            // Download Video
            const videoRes = await axios.get(data.videoUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const captionMsg = `*✅ T I K T O K*

◦ *Nama* : ${data.nickname}
◦ *User* : ${data.username}
◦ *Views* : ${data.views}
◦ *Likes* : ${data.likes}
◦ *Caption* : 
${data.caption}`;

            await sock.sendMessage(msg.key.remoteJid, {
                video: Buffer.from(videoRes.data),
                mimetype: 'video/mp4',
                caption: captionMsg
            }, { quoted: msg });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *Gagal:* ${e.message}` 
            }, { quoted: msg });
        }
    }
};

// [berhasil] tiktok downloader via URL ✓
