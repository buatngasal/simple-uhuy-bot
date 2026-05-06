const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { scraperImageToText } = require('../../lib/scraper-image-to-text');
const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

module.exports = {
    name: 'ocr',
    description: 'Mengekstrak teks dari gambar (OCR)',
    async execute(sock, msg, args) {
        const tempPath = path.join(__dirname, `../temp/ocr_${Date.now()}.jpg`);
        
        try {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const isImage = msg.message?.imageMessage;
            const isQuotedImage = quoted?.imageMessage;

            if (!isImage && !isQuotedImage) {
                return await sock.sendMessage(msg.key.remoteJid, { 
                    text: `Balas gambar dengan perintah: *${commandPrefix}ocr*` 
                }, { quoted: msg });
            }

            await sock.sendMessage(msg.key.remoteJid, { text: '🔍 Sedang membaca gambar...' }, { quoted: msg });

            // Download Media
            const targetMsg = isQuotedImage ? { message: quoted } : msg;
            const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { 
                reuploadRequest: sock.updateMediaMessage 
            });

            // Simpan sementara
            if (!fs.existsSync(path.join(__dirname, '../temp'))) fs.mkdirSync(path.join(__dirname, '../temp'));
            fs.writeFileSync(tempPath, buffer);

            // Panggil Scraper
            const result = await scraperImageToText(tempPath);

            // Kirim Hasil
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `${result}` 
            }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ *Error*: ${error.message}` }, { quoted: msg });
        } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }
};

// [berhasil] fitur OCR untuk membaca teks pada gambar ✓
