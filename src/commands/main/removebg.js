const { removeBackground } = require('@imgly/background-removal-node');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'removebg',
  description: 'Menghapus latar belakang gambar secara otomatis',
  usage: `${commandPrefix}removebg <reply_gambar>`,
  async execute(sock, msg, args) {
    const remoteJid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isImageQuoted = quoted?.imageMessage || quoted?.viewOnceMessageV2?.message?.imageMessage;

    if (!isImageQuoted) {
      return sock.sendMessage(remoteJid, { text: `⚠️ Balas gambar dengan perintah: *${commandPrefix}removebg*` }, { quoted: msg });
    }

    try {
      await sock.sendMessage(remoteJid, { text: '⏳ Sedang memproses gambar...' }, { quoted: msg });

      // 1. Download Gambar dari WA
      const imgMsg = quoted.imageMessage || quoted.viewOnceMessageV2.message.imageMessage;
      const stream = await downloadContentFromMessage(imgMsg, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 2. Perbaikan: Bungkus Buffer ke Blob agar format dikenali
      const { Blob } = require('buffer'); // Pastikan import Blob jika versi Node lama
      const imageBlob = new Blob([buffer], { type: 'image/jpeg' });

      // 3. Proses Hapus Background
      // Tambahkan konfigurasi sederhana jika diperlukan
      const config = {
        model: "medium", // bisa 'small' untuk lebih cepat tapi kualitas turun
        output: {
          type: "image/png", // hasil harus PNG agar transparan
          quality: 0.8
        }
      };

      const resultBlob = await removeBackground(imageBlob, config);
      
      // 4. Konversi kembali ke Buffer untuk dikirim ke WA
      const finalBuffer = Buffer.from(await resultBlob.arrayBuffer());

      // 5. Kirim hasil
      await sock.sendMessage(remoteJid, { 
        image: finalBuffer, 
        caption: '*✅ B A C K G R O U N D ◦ R E M O V E D*' 
      }, { quoted: msg });

    } catch (error) {
      console.error(error);
      await sock.sendMessage(remoteJid, { text: `❌ Gagal memproses: ${error.message}` }, { quoted: msg });
    }
  },
};

// [berhasil] fitur untuk menghapus latar belakang gambar ✓
