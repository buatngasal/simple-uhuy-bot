const NodeWebcam = require("node-webcam");
const fs = require('fs');
const path = require('path');
const config = require('../../../config');

module.exports = {
  name: 'selfie',
  description: 'Ambil foto selfie dari kamera server secara otomatis',
  async execute(sock, msg, args) {
    // 1. Identifikasi Pengirim
    const remoteJid = msg.key.remoteJid;
    const participant = msg.key.participant || remoteJid; // Mengambil ID pengirim (User ID/Dev ID)
    
    // Bersihkan ID untuk perbandingan (menghapus @s.whatsapp.net jika ada)
    const senderID = participant.split('@')[0];

    // 2. Cek Validasi: Apakah senderID ada di ownerNumber ATAU devNumber
    const isOwner = config.ownerNumber.includes(senderID);
    const isDev = config.devNumber.includes(senderID);

    if (!isOwner && !isDev) {
      return await sock.sendMessage(remoteJid, { 
        text: '❌ Akses Ditolak! ID Anda tidak terdaftar sebagai Owner atau Developer.' 
      }, { quoted: msg });
    }

    let tempImgPath = null;
    const opts = {
      width: 1280,
      height: 720,
      quality: 100,
      frames: 1,
      delay: 0,
      saveShots: true,
      output: "jpeg",
      device: false,
      callbackReturn: "location",
      verbose: false
    };

    const Webcam = NodeWebcam.create(opts);

    try {
      await sock.sendMessage(remoteJid, { text: '📸 Sedang mengambil foto...' }, { quoted: msg });

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const fileName = `selfie-${Date.now()}`;
      tempImgPath = path.join(tempDir, `${fileName}.jpg`);

      const captureImage = () => {
        return new Promise((resolve, reject) => {
          Webcam.capture(tempImgPath, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
      };

      await captureImage();

      const imageBuffer = fs.readFileSync(tempImgPath);
      const caption = `📸 *S E L F I E*\n\n✅ Foto berhasil diambil oleh Developer/Owner.\n🕒 Waktu: ${new Date().toLocaleString()}`;

      await sock.sendMessage(
        remoteJid,
        { 
          image: imageBuffer,
          caption: caption,
          contextInfo: {
            externalAdReply: {
              title: "SERVER CAMERA CAPTURE",
              body: `Authorized Access by ${config.ownerName}`,
              mediaType: 1,
              renderLargerThumbnail: true,
              thumbnail: imageBuffer,
            }
          }
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error('Camera Error:', e);
      await sock.sendMessage(remoteJid, { text: `❌ Gagal mengambil foto: ${e.message}` }, { quoted: msg });
    } finally {
      if (tempImgPath && fs.existsSync(tempImgPath)) {
        try { fs.unlinkSync(tempImgPath); } catch (err) {}
      }
    }
  }
};

// [berhasil] fitur selfie kamera untuk mengetahui keadaan server bot ✓
