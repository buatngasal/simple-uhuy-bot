const { Canvas, FontLibrary } = require('skia-canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

ffmpeg.setFfmpegPath(ffmpegPath);

// Registrasi Font Emoji
const fontsDir = path.resolve(__dirname, '../../../src/fonts');
const appleEmojiPath = path.join(fontsDir, 'apple-emoji.ttf');
if (fs.existsSync(appleEmojiPath)) {
    FontLibrary.use("AppleEmoji", appleEmojiPath);
}

module.exports = {
    name: 'emoji',
    description: 'Ubah emoji menjadi stiker',
    usage: `${commandPrefix}emoji 😭`,
    async execute(sock, msg, args) {
        let tempOutput = null;

        try {
            // Jika dipanggil otomatis, args sudah berupa array [ '😭' ]
            // Jika dipanggil via perintah, args berasal dari .emoji 😭
            const input = Array.isArray(args) ? args.join('') : args;
            const emojiArray = [...input.trim()];

            // Validasi: Harus tepat 1 emoji
            if (emojiArray.length !== 1 || !/\p{Emoji}/u.test(emojiArray[0])) {
                return sock.sendMessage(msg.key.remoteJid, { 
                    text: `*Contoh* : ${commandPrefix}emoji 😭` 
                }, { quoted: msg });
            }

            if (emojiArray.length !== 1) return; // Keamanan tambahan

            const emoji = emojiArray[0];
            const canvasSize = 512;
            const canvas = new Canvas(canvasSize, canvasSize);
            const ctx = canvas.getContext('2d');

            ctx.clearRect(0, 0, canvasSize, canvasSize);

            // Ukuran 420px (Full & Padat)
            ctx.font = `420px "AppleEmoji", "Segoe UI Emoji", "Noto Color Emoji"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillText(emoji, canvasSize / 2, canvasSize / 2);

            const buffer = await canvas.toBuffer('png');
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            const tempInput = path.join(tempDir, `in_${Date.now()}.png`);
            tempOutput = path.join(tempDir, `emoji_${Date.now()}.webp`);
            
            fs.writeFileSync(tempInput, buffer);

            await new Promise((resolve, reject) => {
                ffmpeg(tempInput)
                    .outputOptions([
                        '-vcodec', 'libwebp',
                        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(512-iw)/2:(512-ih)/2:color=#00000000',
                        '-lossless', '1'
                    ])
                    .on('end', () => {
                        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                        resolve();
                    })
                    .on('error', reject)
                    .save(tempOutput);
            });

            await sock.sendMessage(msg.key.remoteJid, { 
                sticker: fs.readFileSync(tempOutput) 
            }, { quoted: msg });

        } catch (error) {
            console.error("Emoji Error:", error);
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal membuat stiker emoji.' }, { quoted: msg });
        } finally {
            if (tempOutput && fs.existsSync(tempOutput)) {
                try { fs.unlinkSync(tempOutput); } catch(e) {}
            }
        }
    }
};

// [berhasil] emoji menjadi sticker ✓
