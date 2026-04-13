const { Canvas, FontLibrary } = require('skia-canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

ffmpeg.setFfmpegPath(ffmpegPath);

// --- REGISTRASI FONT ---
const fontsDir = path.resolve(__dirname, '../../../src/fonts');

// Registrasi Arial Narrow
const arialNarrowPath = path.join(fontsDir, 'arial-narrow.ttf');
if (fs.existsSync(arialNarrowPath)) {
    FontLibrary.use("ArialNarrow", arialNarrowPath);
}

// Registrasi Apple Emoji (Opsional untuk gaya iPhone)
const appleEmojiPath = path.join(fontsDir, 'apple-emoji.ttf');
if (fs.existsSync(appleEmojiPath)) {
    FontLibrary.use("AppleEmoji", appleEmojiPath);
}

module.exports = {
    name: 'brat',
    description: 'Brat sticker dengan font Arial Narrow & Emoji Berwarna',
    usage: `${commandPrefix}brat <teks>`,
    async execute(sock, msg, args) {
        let tempOutput = null;

        try {
            let text = args.join(' ');
            if (!text) return sock.sendMessage(msg.key.remoteJid, { text: `*Contoh:* ${commandPrefix}brat kamu imut 😭💖` }, { quoted: msg });

            const canvasSize = 512;
            const canvas = new Canvas(canvasSize, canvasSize);
            const ctx = canvas.getContext('2d');

            // 1. Background Putih
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvasSize, canvasSize);

            // 2. Pengaturan Font (Menggunakan ArialNarrow)
            let fontSize = 95; // Arial Narrow lebih ramping, jadi bisa sedikit lebih besar
            if (text.length > 20) fontSize = 75;
            if (text.length > 50) fontSize = 50;
            if (text.length > 100) fontSize = 40;

            // Prioritas: ArialNarrow -> AppleEmoji -> Font Sistem
            ctx.font = `bold ${fontSize}px "ArialNarrow", "AppleEmoji", "Segoe UI Emoji", "Noto Color Emoji"`;
            ctx.fillStyle = 'black';
            ctx.textBaseline = 'middle';

            // 3. Logika Word Wrap
            const words = text.split(' ');
            let lines = [];
            let currentLine = "";
            const maxWidth = canvasSize * 0.92; // Arial Narrow memungkinkan margin lebih tipis

            for (let word of words) {
                let testLine = currentLine === "" ? word : currentLine + " " + word;
                let metrics = ctx.measureText(testLine);
                if (metrics.width < maxWidth) {
                    currentLine = testLine;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            lines.push(currentLine);

            // 4. Gambar Teks ke Canvas
            const lineHeight = fontSize * 1.05; // Spasi baris lebih rapat khas Brat
            const totalTextHeight = lines.length * lineHeight;
            let y = (canvasSize - totalTextHeight) / 2 + (lineHeight / 2);

            lines.forEach((line) => {
                ctx.fillText(line, 30, y); 
                y += lineHeight;
            });

            // 5. Output Buffer & FFmpeg
            const buffer = await canvas.toBuffer('png');
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            const tempInput = path.join(tempDir, `in_${Date.now()}.png`);
            tempOutput = path.join(tempDir, `brat_${Date.now()}.webp`);
            
            fs.writeFileSync(tempInput, buffer);

            await new Promise((resolve, reject) => {
                ffmpeg(tempInput)
                    .outputOptions([
                        '-vcodec', 'libwebp',
                        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(512-iw)/2:(512-ih)/2:color=white',
                        '-lossless', '1',
                        '-q:v', '80'
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
            console.error("Brat Error:", error);
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal memproses sticker.' }, { quoted: msg });
        } finally {
            if (tempOutput && fs.existsSync(tempOutput)) {
                try { fs.unlinkSync(tempOutput); } catch(e) {}
            }
        }
    }
};

// [fix] brat sticker (emoji support)
