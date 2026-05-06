const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'toaudio',
  description: 'Mengubah voice note menjadi audio/mp3.',
  usage: `${commandPrefix}toaudio <reply_vn>`,
  async execute(sock, msg, args) {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    
    // Validasi: pastikan membalas pesan audio (VN masuk dalam kategori audioMessage)
    if (!quoted || !quoted.audioMessage) {
      return sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Balas voice note dengan perintah: *${commandPrefix}toaudio*` }, { quoted: msg });
    }

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Download media
      const buffer = await downloadMediaMessage(
        { key: msg.key, message: quoted },
        'buffer'
      );

      const tempInput = path.join(tempDir, `input_vn_${Date.now()}`);
      const tempOutput = path.join(tempDir, `output_audio_${Date.now()}.mp3`);

      fs.writeFileSync(tempInput, buffer);

      // Konversi ke format MP3
      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .toFormat('mp3')
          .audioBitrate('128k') // Kualitas standar
          .on('end', resolve)
          .on('error', reject)
          .save(tempOutput);
      });

      const audioBuffer = fs.readFileSync(tempOutput);

      // Kirim sebagai Audio Biasa (bukan VN, ptt: false)
      await sock.sendMessage(
        msg.key.remoteJid, 
        { 
          audio: audioBuffer, 
          mimetype: 'audio/mpeg', 
          ptt: false // Dikirim sebagai file audio biasa
        }, 
        { quoted: msg }
      );

      // Hapus file sampah
      fs.unlinkSync(tempInput);
      fs.unlinkSync(tempOutput);

    } catch (error) {
      console.error(error);
      sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat mengonversi audio.' }, { quoted: msg });
    }
  },
};

// [berhasil] fitur ubah voice note ke audio / mp3 ✓
