const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'tomp3',
  description: 'Mengubah video/voice_note menjadi audio_mp3.',
  usage: `${commandPrefix}tomp3 <reply_video/voice_note>`,
  async execute(sock, msg, args) {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || (!quoted.videoMessage && !quoted.audioMessage)) {
      return sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Balas video atau voice note dengan perintah: *${commandPrefix}tomp3*` }, { quoted: msg });
    }

    let mediaType = quoted.videoMessage ? 'video' : 'audio';
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const stream = await downloadMediaMessage(
      { key: msg.key, message: quoted },
      sock
    );

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const tempInput = path.join(tempDir, `${Date.now()}.${mediaType === 'video' ? 'mp4' : 'ogg'}`);
    const tempOutput = path.join(tempDir, `${Date.now()}.mp3`);

    fs.writeFileSync(tempInput, buffer);

    await new Promise((resolve, reject) => {
      ffmpeg(tempInput)
        .toFormat('mp3')
        .save(tempOutput)
        .on('end', resolve)
        .on('error', reject);
    });

    const mp3Buffer = fs.readFileSync(tempOutput);

    // --- BAGIAN GENERATE NAMA FILE ---
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // Hasil: 20260420
    const randomSuffix = Math.floor(Math.random() * 9000) + 1000; // Hasil: 4 angka acak (WA1000 - WA9999)
    const fileName = `AUD-${dateStr}-WA${randomSuffix}.mp3`;
    // ---------------------------------

    await sock.sendMessage(
      msg.key.remoteJid, 
      { 
        document: mp3Buffer, 
        mimetype: 'audio/mpeg', 
        fileName: fileName // Menggunakan nama file baru
      }, 
      { quoted: msg }
    );

    fs.unlinkSync(tempInput);
    fs.unlinkSync(tempOutput);
  },
};

// [berhasil] fitur ubah video atau voice note ke file mp3 ✓
