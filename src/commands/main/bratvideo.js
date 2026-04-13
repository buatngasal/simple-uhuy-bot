const { Canvas, FontLibrary } = require('skia-canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

ffmpeg.setFfmpegPath(ffmpegPath);

// --- REGISTRASI FONT ---
const fontsDir = path.resolve(__dirname, '../../../src/fonts');

const arialNarrowPath = path.join(fontsDir, 'arial-narrow.ttf');
if (fs.existsSync(arialNarrowPath)) FontLibrary.use("ArialNarrow", arialNarrowPath);

const appleEmojiPath = path.join(fontsDir, 'apple-emoji.ttf');
if (fs.existsSync(appleEmojiPath)) FontLibrary.use("AppleEmoji", appleEmojiPath);

module.exports = {
    name: 'bratvideo',
    description: 'Brat animated sticker',
    usage: `${commandPrefix}bratvideo <teks>`,
    async execute(sock, msg, args) {
        let tempFolder = null;
        let outputWebp = null;

        try {
            let text = args.join(' ');
            if (!text) return sock.sendMessage(msg.key.remoteJid, { text: `*Contoh:* ${commandPrefix}bratvideo halo sayang 😭💖` }, { quoted: msg });

            const words = text.split(/\s+/); // Split berdasarkan spasi/whitespace
            const canvasSize = 512;
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            tempFolder = path.join(tempDir, `brat_frames_${Date.now()}`);
            fs.mkdirSync(tempFolder);

            // 1. Generate Frames
            // Kita tambahkan 5 frame ekstra di akhir agar kata terakhir "diam" sebentar
            const totalFrames = words.length + 5; 

            for (let i = 0; i < totalFrames; i++) {
                const canvas = new Canvas(canvasSize, canvasSize);
                const ctx = canvas.getContext('2d');
                
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvasSize, canvasSize);

                let fontSize = 95;
                if (text.length > 20) fontSize = 75;
                if (text.length > 50) fontSize = 50;

                // AKTIFKAN FALLBACK FONT UNTUK EMOJI
                ctx.font = `bold ${fontSize}px "ArialNarrow", "AppleEmoji", "Segoe UI Emoji", "Noto Color Emoji"`;
                ctx.fillStyle = 'black';
                ctx.textBaseline = 'middle';

                // Ambil kata sampai index i, tapi jangan melebihi jumlah kata asli
                const currentIdx = Math.min(i + 1, words.length);
                const currentText = words.slice(0, currentIdx).join(' ');
                
                // Word Wrap Logika
                const frameWords = currentText.split(' ');
                let lines = [];
                let currentLine = "";
                const maxWidth = canvasSize * 0.9;

                for (let word of frameWords) {
                    let testLine = currentLine === "" ? word : currentLine + " " + word;
                    if (ctx.measureText(testLine).width < maxWidth) {
                        currentLine = testLine;
                    } else {
                        lines.push(currentLine);
                        currentLine = word;
                    }
                }
                lines.push(currentLine);

                const lineHeight = fontSize * 1.05;
                let y = (canvasSize - (lines.length * lineHeight)) / 2 + (lineHeight / 2);

                lines.forEach((line) => {
                    ctx.fillText(line, 30, y);
                    y += lineHeight;
                });

                const framePath = path.join(tempFolder, `frame_${String(i).padStart(3, '0')}.png`);
                fs.writeFileSync(framePath, await canvas.toBuffer('png'));
            }

            // 2. Proses dengan FFmpeg
            outputWebp = path.join(tempDir, `brat_anim_${Date.now()}.webp`);
            
            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(path.join(tempFolder, 'frame_%03d.png'))
                    .inputFPS(3) // Sedikit lebih cepat (3 kata per detik)
                    .outputOptions([
                        '-vcodec', 'libwebp',
                        '-lossless', '1',
                        '-loop', '0', 
                        '-preset', 'default',
                        '-an',
                        '-vsync', '0',
                        '-s', '512:512'
                    ])
                    .on('end', resolve)
                    .on('error', (err) => {
                        console.error("FFmpeg error:", err);
                        reject(err);
                    })
                    .save(outputWebp);
            });

            // 3. Kirim Sticker
            await sock.sendMessage(msg.key.remoteJid, { 
                sticker: fs.readFileSync(outputWebp) 
            }, { quoted: msg });

        } catch (error) {
            console.error("Brat Anim Error:", error);
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal memproses animasi.' }, { quoted: msg });
        } finally {
            // 4. Cleanup yang lebih aman di blok finally
            if (outputWebp && fs.existsSync(outputWebp)) fs.unlinkSync(outputWebp);
            if (tempFolder && fs.existsSync(tempFolder)) fs.rmSync(tempFolder, { recursive: true, force: true });
        }
    }
};

// [fix] brat animated sticker (emoji support)
