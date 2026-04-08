const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'smeme',
  description: 'Membuat stiker meme dari gambar/video yang di-reply',
  usage: `${commandPrefix}smeme teks atas | teks bawah`,
  async execute(sock, msg, args) {
    let tempInput = null;
    let tempOutput = null;
    
    try {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
        return sock.sendMessage(msg.key.remoteJid, { text: `Balas gambar atau video pendek dengan: *${commandPrefix}smeme teks atas | teks bawah*` }, { quoted: msg });
      }

      // 1. Path Font (src/fonts/impact.ttf)
      const fontPath = path.join(__dirname, '../../../src/fonts/impact.ttf').replace(/\\/g, '/').replace(/:/g, '\\:');

      // 2. Ambil Teks Meme
      const fullText = args.join(' ');
      const [topText, bottomText] = fullText.split('|').map(t => t ? t.trim().toUpperCase() : '');

      // 3. Download Media
      const mediaType = quoted.imageMessage ? 'image' : 'video';
      const stream = await downloadMediaMessage({ key: msg.key, message: quoted }, sock);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      
      tempInput = path.join(tempDir, `${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`);
      tempOutput = path.join(tempDir, `${Date.now()}.webp`);
      fs.writeFileSync(tempInput, buffer);

      // 4. Proses FFmpeg
      const videoFilters = [
        'scale=512:512:force_original_aspect_ratio=decrease',
        'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0'
      ];

      if (topText) {
        videoFilters.push(`drawtext=fontfile='${fontPath}':text='${topText}':fontsize=40:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=25`);
      }
      if (bottomText) {
        videoFilters.push(`drawtext=fontfile='${fontPath}':text='${bottomText}':fontsize=40:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-text_h-25`);
      }

      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .outputOptions([
            '-vcodec', 'libwebp',
            '-vf', videoFilters.join(','),
            '-lossless', '1', '-q:v', '50', '-loop', '0'
          ])
          .save(tempOutput)
          .on('end', resolve)
          .on('error', reject);
      });
      
      await sock.sendMessage(msg.key.remoteJid, { sticker: fs.readFileSync(tempOutput) }, { quoted: msg });
      
    } catch (error) {
      console.error('Smeme Error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal membuat stiker meme.' }, { quoted: msg });
    } finally {
      if (tempInput && fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (tempOutput && fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    }
  },
};

// [fix] sticker meme ✓