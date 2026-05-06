const { downloadMediaMessage, normalizeMessageContent, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'torvo',
  description: 'Mengubah media/stiker/audio menjadi View Once',
  usage: `${commandPrefix}torvo <teks/caption> (reply media)`,
  async execute(sock, msg, args) {
    const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg) return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Balas media (gambar, video, stiker, atau audio)!' }, { quoted: msg });

    const uniqueId = Date.now();
    const tempIn = path.join(os.tmpdir(), `in_${uniqueId}`);
    const tempOut = path.join(os.tmpdir(), `out_${uniqueId}`);

    try {
      const content = normalizeMessageContent(quotedMsg);
      const type = Object.keys(content).find(key => key.includes('Message')); 
      
      let buffer;
      let finalType = ''; 

      // 1. Logika Caption
      const userCaption = args.join(' ');
      const originalCaption = content[type]?.caption || '';
      const finalCaption = userCaption.length > 0 ? userCaption : (originalCaption || '✅');

      // 2. PENANGANAN AUDIO / MP3 / DOCUMENT (Menjadi VN View Once)
      if (type === 'audioMessage' || (type === 'documentMessage' && content.documentMessage.mimetype.includes('audio'))) {
        const audioBuffer = await downloadMediaMessage(
          { key: msg.key, message: content },
          'buffer',
          {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        );
        
        fs.writeFileSync(tempIn, audioBuffer);
        const outPath = tempOut + '.opus';

        await new Promise((resolve, reject) => {
          ffmpeg(tempIn)
            .toFormat('opus')
            .audioChannels(1)
            .on('end', resolve)
            .on('error', reject)
            .save(outPath);
        });

        buffer = fs.readFileSync(outPath);
        finalType = 'vn';
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      } 
      // 3. PENANGANAN STIKER (DIAM & GERAK)
      else if (type === 'stickerMessage') {
        const stream = await downloadContentFromMessage(content.stickerMessage, 'sticker');
        let stickerBuffer = Buffer.from([]);
        for await (const chunk of stream) {
          stickerBuffer = Buffer.concat([stickerBuffer, chunk]);
        }
        const metadata = await sharp(stickerBuffer).metadata();

        if (metadata.pages > 1) {
          const gifBuffer = await sharp(stickerBuffer, { animated: true }).toFormat('gif').toBuffer();
          fs.writeFileSync(tempIn, gifBuffer);
          const outPath = tempOut + '.mp4';

          await new Promise((resolve, reject) => {
            ffmpeg(tempIn)
              .outputOptions(['-vcodec libx264', '-pix_fmt yuv420p', '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2', '-preset ultrafast', '-an'])
              .toFormat('mp4')
              .on('end', resolve)
              .on('error', reject)
              .save(outPath);
          });
          buffer = fs.readFileSync(outPath);
          finalType = 'video';
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        } else {
          buffer = await sharp(stickerBuffer)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .toFormat('jpeg')
            .toBuffer();
          finalType = 'image';
        }
      } 
      // 4. PENANGANAN GAMBAR/VIDEO ASLI
      else if (type === 'imageMessage' || type === 'videoMessage') {
        buffer = await downloadMediaMessage(
          { key: msg.key, message: content },
          'buffer',
          {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        );
        finalType = type === 'imageMessage' ? 'image' : 'video';
      } else {
        return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Format media tidak didukung untuk View Once.' }, { quoted: msg });
      }

      // 5. PROSES PENGIRIMAN AKHIR
      if (finalType === 'image') {
        await sock.sendMessage(msg.key.remoteJid, { image: buffer, caption: finalCaption, viewOnce: true }, { quoted: msg });
      } else if (finalType === 'video') {
        await sock.sendMessage(msg.key.remoteJid, { video: buffer, caption: finalCaption, viewOnce: true }, { quoted: msg });
      } else if (finalType === 'vn') {
        await sock.sendMessage(msg.key.remoteJid, { 
          audio: buffer, 
          mimetype: 'audio/ogg; codecs=opus', 
          ptt: true, 
          viewOnce: true 
        }, { quoted: msg });
      }

    } catch (e) {
      console.error('ToRVO Master Error:', e);
      sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat memproses media.' }, { quoted: msg });
    } finally {
      if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
    }
  },
};

// [berhasil] fitur ubah berbagai pesan media ke view once ✓
