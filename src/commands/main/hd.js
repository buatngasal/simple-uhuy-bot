const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { picsartHD } = require('../../lib/scraper-picsart-hd');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'hd',
  description: 'Meningkatkan kualitas gambar buram menjadi jelas',
  usage: `${commandPrefix}hd <reply_gambar>`,
  async execute(sock, msg, args) {
    try {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      const mediaData = quoted?.imageMessage || msg.message.imageMessage;

      if (!mediaData) {
        return sock.sendMessage(msg.key.remoteJid, { 
          text: `⚠️ Balas gambar dengan perintah: ${commandPrefix}hd` 
        }, { quoted: msg });
      }

      await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Sedang memproses gambar...' }, { quoted: msg });

      // Download Media ke Buffer
      const stream = await downloadContentFromMessage(mediaData, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      // Panggil Library
      const resultBuffer = await picsartHD(buffer);

      await sock.sendMessage(msg.key.remoteJid, { 
        image: resultBuffer, 
        caption: '*✅ I M A G E ◦ E N H A N C E R*' 
      }, { quoted: msg });

    } catch (error) {
      console.error('HD Command Error:', error);
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `❌ Terjadi kesalahan: ${error.message}` 
      }, { quoted: msg });
    }
  },
};

// [berhasil] fitur HD untuk memperjelas gambar buram ✓
