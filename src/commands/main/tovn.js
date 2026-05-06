const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'tovn',
  description: 'Mengubah audio/mp3 menjadi voice note.',
  usage: `${commandPrefix}tovn <reply_audio/mp3>`,
  async execute(sock, msg, args) {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    
    // Validasi: pastikan membalas pesan audio/document
    if (!quoted || (!quoted.audioMessage && !quoted.documentMessage)) {
      return sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Balas audio atau file MP3 dengan perintah: *${commandPrefix}tovn*` }, { quoted: msg });
    }

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download media
    const stream = await downloadMediaMessage(
      { key: msg.key, message: quoted },
      'buffer' // Menggunakan buffer langsung jika library mendukung, atau pakai loop chunk Anda
    );

    const tempInput = path.join(tempDir, `input_${Date.now()}`);
    const tempOutput = path.join(tempDir, `output_${Date.now()}.opus`);

    fs.writeFileSync(tempInput, stream);

    // Konversi ke format opus (standar Voice Note WA)
    await new Promise((resolve, reject) => {
      ffmpeg(tempInput)
        .toFormat('opus')
        .audioChannels(1) // Mono agar lebih ringan
        .on('end', resolve)
        .on('error', reject)
        .save(tempOutput);
    });

    const vnBuffer = fs.readFileSync(tempOutput);

    // Kirim sebagai Voice Note (ptt: true)
    await sock.sendMessage(
      msg.key.remoteJid, 
      { 
        audio: vnBuffer, 
        mimetype: 'audio/ogg; codecs=opus', 
        ptt: true 
      }, 
      { quoted: msg }
    );

    // Hapus file sampah
    fs.unlinkSync(tempInput);
    fs.unlinkSync(tempOutput);
  },
};

// [berhasil] fitur ubah audio / mp3 ke voice note ✓
