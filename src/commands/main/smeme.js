const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');

ffmpeg.setFfmpegPath(ffmpegPath);

// Fungsi untuk membungkus teks agar tidak melebar keluar gambar
function wrapText(text, maxChars = 20) {
  const words = text.split(' ');
  let lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length <= maxChars) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });
  lines.push(currentLine);
  return lines.join('\n');
}

module.exports = {
  name: 'smeme',
  description: 'Membuat stiker meme dari gambar/video dengan font Impact',
  usage: `${commandPrefix}smeme teks atas | teks bawah`,
  async execute(sock, msg, args) {
    let tempInput = null;
    let tempOutput = null;

    try {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
        return sock.sendMessage(msg.key.remoteJid, { text: `Balas gambar/video pendek: *${commandPrefix}smeme atas | bawah*` }, { quoted: msg });
      }

      // 1. PATH FONT - Trik khusus Windows agar FFmpeg mengenali drive letter (C\:/...)
      const absoluteFontPath = path.resolve(__dirname, '../../../src/fonts/impact.ttf').replace(/\\/g, '/');
      const escapedFontPath = absoluteFontPath.replace(/:/g, '\\:');

      if (!fs.existsSync(absoluteFontPath)) {
        return sock.sendMessage(msg.key.remoteJid, { text: '❌ Font impact.ttf tidak ditemukan!' }, { quoted: msg });
      }

      // 2. PROSES TEKS
      const fullText = args.join(' ');
      let [topText, bottomText] = fullText.split('|').map(t => t ? t.trim().toUpperCase() : '');
      
      // Fungsi internal untuk escape karakter khusus FFmpeg
      const ffmpegEscape = (text) => {
        return text
          .replace(/\\/g, '\\\\\\\\') // Escape backslash
          .replace(/'/g, "'\\\\\\''")  // Escape single quote
          .replace(/:/g, '\\:')       // Escape colon
          .replace(/%/g, '%%');       // Escape percent sign (untuk teks)
      };

      // Bungkus teks dan aplikasikan escape
      if (topText) {
        topText = wrapText(topText, 18);
        topText = ffmpegEscape(topText);
      }
      if (bottomText) {
        bottomText = wrapText(bottomText, 18);
        bottomText = ffmpegEscape(bottomText);
      }

      // 3. DOWNLOAD MEDIA
      const isVideo = !!quoted.videoMessage;
      const stream = await downloadMediaMessage({ key: msg.key, message: quoted }, sock);
      const buffer = [];
      for await (const chunk of stream) buffer.push(chunk);
      const mediaBuffer = Buffer.concat(buffer);

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      tempInput = path.join(tempDir, `in_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
      tempOutput = path.join(tempDir, `out_${Date.now()}.webp`);
      fs.writeFileSync(tempInput, mediaBuffer);

      // 4. FILTER FFMPEG
      const baseFilters = [
        'scale=512:512:force_original_aspect_ratio=decrease',
        'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0'
      ];

      // PENTING: Gunakan tanda kutip tunggal di sekitar text='${topText}'
      if (topText) {
        baseFilters.push(`drawtext=fontfile='${escapedFontPath}':text='${topText}':fontsize=45:fontcolor=white:borderw=3:bordercolor=black:line_spacing=5:x=(w-text_w)/2:y=25`);
      }
      if (bottomText) {
        baseFilters.push(`drawtext=fontfile='${escapedFontPath}':text='${bottomText}':fontsize=45:fontcolor=white:borderw=3:bordercolor=black:line_spacing=5:x=(w-text_w)/2:y=h-text_h-25`);
      }

      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .complexFilter(baseFilters.join(','))
          .outputOptions([
            '-vcodec', 'libwebp',
            '-lossless', '1',
            '-q:v', '45',
            '-loop', '0',
            '-an',
            '-vsync', '0',
            '-preset', 'default'
          ])
          .on('end', resolve)
          .on('error', (err) => {
            console.error('FFmpeg Error:', err.message);
            reject(err);
          })
          .save(tempOutput);
      });

      await sock.sendMessage(msg.key.remoteJid, { sticker: fs.readFileSync(tempOutput) }, { quoted: msg });

    } catch (error) {
      console.error('Smeme Error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat memproses stiker.' }, { quoted: msg });
    } finally {
      // Cleanup
      if (tempInput && fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (tempOutput && fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    }
  }
};

// [fix] sticker meme: support colon escaping
