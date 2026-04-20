const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'tovideo',
  description: 'Mengubah stiker animasi ke MP4 (Real Video)',
  usage: `${commandPrefix}tovideo (balas stiker)`,
  async execute(sock, msg, args) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const stickerMsg = quoted?.stickerMessage || msg.message?.stickerMessage;

    if (!stickerMsg) {
      return await sock.sendMessage(msg.key.remoteJid, { 
        text: `Silahkan balas stiker animasi dengan perintah *${commandPrefix}tovideo*` 
      }, { quoted: msg });
    }

    // Pastikan stiker adalah animasi (WebP)
    if (stickerMsg.isAnimated === false) {
        return await sock.sendMessage(msg.key.remoteJid, { text: 'Perintah ini hanya untuk stiker animasi.' }, { quoted: msg });
    }

    // Nama file temporer
    const tempGif = path.join(__dirname, `temp_${Date.now()}.gif`);
    const tempMp4 = path.join(__dirname, `temp_${Date.now()}.mp4`);

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang mengonversi ke Video...' }, { quoted: msg });

      // 1. PROSES: STICKER > BUFFER
      const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 2. PROSES: BUFFER > GIF (via Sharp)
      // Kita butuh GIF sebagai jembatan agar FFmpeg bisa membaca frame animasinya
      const gifBuffer = await sharp(buffer, { animated: true })
        .toFormat('gif')
        .toBuffer();
      
      fs.writeFileSync(tempGif, gifBuffer);

      // 3. PROSES: GIF > MP4 (via FFmpeg)
      await new Promise((resolve, reject) => {
        ffmpeg(tempGif)
          .outputOptions([
            '-pix_fmt yuv420p',                // Format warna standar MP4
            '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2', // Memastikan dimensi genap
            '-preset ultrafast'                // Mempercepat proses konversi
          ])
          .toFormat('mp4')
          .on('end', resolve)
          .on('error', (err) => {
            console.error('FFmpeg Error:', err);
            reject(err);
          })
          .save(tempMp4);
      });

      // 4. KIRIM HASILNYA
      const videoBuffer = fs.readFileSync(tempMp4);
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          video: videoBuffer,
          mimetype: 'video/mp4',
          caption: 'Berhasil dikonversi ke MP4!',
          gifPlayback: false // Set true jika ingin video berputar terus (loop)
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error(e);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: '❌ Terjadi kesalahan saat memproses stiker.' },
        { quoted: msg }
      );
    } finally {
      // Hapus file sampah agar storage tidak penuh
      if (fs.existsSync(tempGif)) fs.unlinkSync(tempGif);
      if (fs.existsSync(tempMp4)) fs.unlinkSync(tempMp4);
    }
  }
};

// [fix] sticker to video ✓
