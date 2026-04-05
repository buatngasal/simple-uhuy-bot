const { getContentType } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'r',
  description: 'Mengirim kembali pesan yang di-reply (get quoted object)',
  usage: `${commandPrefix}r`,
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;
      
      // Ambil context info dari pesan yang masuk
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quoted) {
        return sock.sendMessage(id, { text: '❌ Silakan reply pesan yang ingin diambil!' }, { quoted: msg });
      }

      // Mendapatkan tipe pesan yang di-reply (imageMessage, stickerMessage, dll)
      const type = getContentType(quoted);
      const content = quoted[type];

      // Jika yang di-reply ternyata juga mengandung reply (nested quoted)
      // Ini menyesuaikan logika "anu.quoted" pada contoh kash kamu
      if (content?.contextInfo?.quotedMessage) {
        const nestedQuoted = content.contextInfo.quotedMessage;
        const nestedType = getContentType(nestedQuoted);
        
        // Menggunakan relayMessage untuk mengirim ulang struktur pesan asli
        await sock.relayMessage(id, { 
          [nestedType]: nestedQuoted[nestedType] 
        }, { quoted: msg });
        
      } else {
        // Jika hanya ingin mengirim ulang pesan yang di-reply secara langsung
        // Kita gunakan fitur forward atau kirim ulang tipenya
        await sock.relayMessage(id, { 
          [type]: content 
        }, { quoted: msg });
      }

    } catch (error) {
      console.error('Error Quoted Command:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Format Tidak Tersedia atau terjadi kesalahan.' }, { quoted: msg });
    }
  }
};

// [fix] mengirim kembali pesan yang di-reply ✓