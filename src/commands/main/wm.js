const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { commandPrefix } = require('../../../config');
const { botName } = require('../../../config');
const { ownerName } = require('../../../config');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  name: 'wm',
  description: 'Ubah media ke stiker + watermark khusus',
  usage: `${commandPrefix}wm packname|author`,
  async execute(sock, msg, args) {
    let tempInput = null;
    let tempOutput = null;
    
    try {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage || msg.message.stickerMessage || msg.message.imageMessage || msg.message.videoMessage;
      let buffer, mediaType, mime;

      // Logika penentuan packname dan author (Watermark)
      let text = args.join(" ");
      let packname = text.split('|')[0] ? text.split('|')[0] : `${botName}`;
      let author = text.split('|')[1] ? text.split('|')[1] : `${ownerName}`;

      if (quoted) {
        // Deteksi tipe media dari quoted atau pesan langsung
        const type = Object.keys(quoted)[0];
        if (type === 'imageMessage') {
            mediaType = 'image';
            mime = 'image/jpeg';
        } else if (type === 'videoMessage') {
            if (quoted.videoMessage.seconds > 11) return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Maksimal durasi 10 detik!' }, { quoted: msg });
            mediaType = 'video';
            mime = 'video/mp4';
        } else if (type === 'stickerMessage') {
            mediaType = 'sticker';
            mime = 'image/webp';
        } else {
            return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Reply gambar/video/stiker!' }, { quoted: msg });
        }
        
        // Download media
        const stream = await downloadContentFromMessage(quoted[type], mediaType === 'sticker' ? 'sticker' : mediaType);
        let bufferArr = [];
        for await (const chunk of stream) { bufferArr.push(chunk) }
        buffer = Buffer.concat(bufferArr);

      } else if (args[0] && args[0].startsWith('http')) {
        const res = await axios.get(args[0], { responseType: 'arraybuffer' });
        buffer = Buffer.from(res.data);
        mediaType = 'image';
      } else {
        return sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Kirim/reply gambar/video dengan caption ${commandPrefix}wm pack|author` }, { quoted: msg });
      }

      const sticker = new Sticker(buffer, {
        pack: packname, 
        author: author, 
        type: StickerTypes.FULL, // bisa diganti CROPPED jika ingin kotak
        categories: ['🤩', '🎉'],
        id: '12345',
        quality: 50,
      });

      const stickerBuffer = await sticker.toBuffer();
      await sock.sendMessage(msg.key.remoteJid, { sticker: stickerBuffer }, { quoted: msg });

    } catch (error) {
      console.error('Sticker command error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal membuat stiker.' }, { quoted: msg });
    }
  },
};

// [berhasil] stiker + watermark kustom ✓
