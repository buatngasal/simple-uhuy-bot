const { downloadMediaMessage, normalizeMessageContent } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'rvo',
  description: 'Membaca pesan View Once',
  usage: `${commandPrefix}rvo <reply_viewonce>`,
  async execute(sock, msg, args) {
    // 1. Ambil pesan yang di-reply
    const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg) return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Balas pesan View Once!' }, { quoted: msg });

    try {
      /**
       * 2. UNWRAP & NORMALIZE (Penting!)
       * Fungsi ini otomatis mengupas 'viewOnceMessage', 'ephemeralMessage', dll.
       * sehingga menyisakan objek 'imageMessage' atau 'videoMessage' murni.
       */
      const content = normalizeMessageContent(quotedMsg);
      
      // Ambil tipe media (misal: 'imageMessage')
      const type = Object.keys(content)[0];
      
      // Validasi apakah benar-benar media yang bisa didownload
      if (!type || !['imageMessage', 'videoMessage', 'audioMessage'].includes(type)) {
        return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Bukan pesan media sekali lihat yang valid.' }, { quoted: msg });
      }

      // 3. Download Media
      // Gunakan 'content' hasil normalisasi agar Media Key terbaca dengan benar
      const buffer = await downloadMediaMessage(
        { key: msg.key, message: content },
        'buffer',
        {},
        { 
          logger: console, 
          reuploadRequest: sock.updateMediaMessage 
        }
      );

      const mediaData = content[type];
      const caption = mediaData.caption || '✅ Terbongkar via RVO';

      // 4. Kirim ulang sesuai jenis media
      if (type === 'imageMessage') {
        await sock.sendMessage(msg.key.remoteJid, { image: buffer, caption }, { quoted: msg });
      } else if (type === 'videoMessage') {
        await sock.sendMessage(msg.key.remoteJid, { video: buffer, caption }, { quoted: msg });
      } else if (type === 'audioMessage') {
        await sock.sendMessage(msg.key.remoteJid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg });
      }

    } catch (e) {
      console.error('RVO Final Error:', e);
      // Jika masih error, besar kemungkinan media sudah expired di server WA
      sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal: Media mungkin sudah dilihat atau expired.' }, { quoted: msg });
    }
  },
};

// [berhasil] read view once ✓
