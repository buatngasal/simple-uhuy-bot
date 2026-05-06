const { aiScraper } = require('../../lib/scraper-ai');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { scraperImageToText } = require('../../lib/scraper-image-to-text');
const { commandPrefix } = require('../../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ai',
    description: 'Tanya AI via ChatGPT',
    usage: `${commandPrefix}ai <pertanyaan>`,
    async execute(sock, msg, args) {
        let query = args.join(' ');
        
        // 1. Identifikasi apakah ada pesan yang di-reply atau gambar langsung
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isImage = msg.message?.imageMessage;
        const isQuotedImage = quoted?.imageMessage;

        let extractedText = '';
        let tempPath = null;

        try {
            // 2. Jika ada gambar, jalankan scraperImageToText
            if (isImage || isQuotedImage) {
                await sock.sendMessage(msg.key.remoteJid, { text: '🔍 Membaca teks dalam gambar...' }, { quoted: msg });
                
                const targetMsg = isQuotedImage ? { key: msg.key, message: quoted } : msg;
                const buffer = await downloadMediaMessage(targetMsg, 'buffer');

                tempPath = path.join(__dirname, `../temp/ai_${Date.now()}.jpg`);
                fs.writeFileSync(tempPath, buffer);

                extractedText = await scraperImageToText(tempPath);
            }

            // 3. Ambil teks dari quoted message (jika berupa teks biasa)
            const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text;

            // 4. Gabungkan semua konteks: Query user + Pesan Reply + Teks Hasil OCR
            let context = [];
            if (query) context.push(query);
            if (quotedText) context.push(`[Pesan Reply]: ${quotedText}`);
            if (extractedText) context.push(`[Teks dari Gambar]: ${extractedText}`);

            const finalQuery = context.join('\n\n');

            if (!finalQuery) {
                return sock.sendMessage(msg.key.remoteJid, { 
                    text: `*Contoh* : ${commandPrefix}ai apa itu cinta?\nAtau balas gambar/teks dengan perintah: ${commandPrefix}ai <pertanyaan>` 
                }, { quoted: msg });
            }

            await sock.sendMessage(msg.key.remoteJid, { text: '⌛ Sedang memproses jawaban...' }, { quoted: msg });

            // 5. Kirim ke AI Scraper
            const result = await aiScraper(finalQuery);

            if (!result) {
                return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Tidak ada respon dari AI.' }, { quoted: msg });
            }

            await sock.sendMessage(msg.key.remoteJid, { text: result }, { quoted: msg });

        } catch (error) {
            console.error("AI/OCR Error:", error.message);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ Gagal memproses permintaan: ${error.message}` 
            }, { quoted: msg });
        } finally {
            if (tempPath && fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }
    }
};

// [berhasil] fitur ai dari chat-gpt mendukung reply pesan/gambar ✓
