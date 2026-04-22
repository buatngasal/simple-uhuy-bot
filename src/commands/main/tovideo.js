const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
  name: 'tovideo',
  description: 'Mengubah stiker animasi ke MP4',
  usage: `${commandPrefix}tovideo (balas stiker animasi)`,
  async execute(sock, msg, args) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const stickerMsg = quoted?.stickerMessage || msg.message?.stickerMessage;

    if (!stickerMsg) {
      return await sock.sendMessage(msg.key.remoteJid, { text: 'Balas stiker animasi!' }, { quoted: msg });
    }

    const uniqueId = Date.now();
    const tempGif = path.join(os.tmpdir(), `in_${uniqueId}.gif`);
    const tempMp4 = path.join(os.tmpdir(), `out_${uniqueId}.mp4`);

    try {
      const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Cek apakah benar-benar animasi
      const metadata = await sharp(buffer).metadata();
      if (!metadata.pages || metadata.pages <= 1) {
        return await sock.sendMessage(msg.key.remoteJid, { text: `Ini bukan stiker animasi. Gunakan *${commandPrefix}toimg* untuk stiker diam.` }, { quoted: msg });
      }

      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Mengonversi ke Video...' }, { quoted: msg });

      // Proses Sharp ke GIF
      const gifBuffer = await sharp(buffer, { animated: true }).toFormat('gif').toBuffer();
      fs.writeFileSync(tempGif, gifBuffer);

      // Proses FFmpeg ke MP4
      await new Promise((resolve, reject) => {
        ffmpeg(tempGif)
          .outputOptions(['-vcodec libx264', '-pix_fmt yuv420p', '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2', '-preset ultrafast', '-an'])
          .toFormat('mp4')
          .on('end', resolve)
          .on('error', reject)
          .save(tempMp4);
      });

      await sock.sendMessage(msg.key.remoteJid, {
        video: fs.readFileSync(tempMp4),
        mimetype: 'video/mp4',
        caption: '✅ Stiker animasi berhasil diubah!'
      }, { quoted: msg });

    } catch (e) {
      console.error(e);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal mengonversi ke video.' }, { quoted: msg });
    } finally {
      if (fs.existsSync(tempGif)) fs.unlinkSync(tempGif);
      if (fs.existsSync(tempMp4)) fs.unlinkSync(tempMp4);
    }
  }
};
