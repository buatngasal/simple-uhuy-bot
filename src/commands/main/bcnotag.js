const { getContentType } = require('@whiskeysockets/baileys');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'bcnotag',
  description: 'Broadcast pesan ke semua grup tanpa tag-all',
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;
      const textInput = args.join(' '); // Ambil teks setelah perintah
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      let broadcastContent = {};

      if (quoted) {
        // KONDISI 1: Reply Media/Pesan
        const type = getContentType(quoted);
        broadcastContent = { ...quoted };

        // Jika ada teks tambahan di perintah (contoh: .bcnotag bagus gak?)
        // Maka ganti caption/teks aslinya dengan teks baru
        if (textInput) {
          if (broadcastContent[type].hasOwnProperty('caption')) {
            broadcastContent[type].caption = textInput;
          } else if (type === 'conversation' || type === 'extendedTextMessage') {
            broadcastContent = { conversation: textInput };
          }
        }
      } else if (textInput) {
        // KONDISI 2: Teks Langsung (contoh: .bcnotag halo semua)
        broadcastContent = { conversation: textInput };
      } else {
        // Jika tidak ada reply dan tidak ada teks
        return sock.sendMessage(id, { text: `⚠️ Gunakan perintah: *${commandPrefix}bcnotag [teks]* atau balas pesan/media.` }, { quoted: msg });
      }

      // Ambil daftar semua grup
      const chats = await sock.groupFetchAllParticipating();
      const groups = Object.keys(chats);

      await sock.sendMessage(id, { text: `⏳ Mengirim broadcast (No Tag) ke ${groups.length} grup...` }, { quoted: msg });

      for (const jid of groups) {
        try {
          // Kirim pesan tanpa modifikasi contextInfo (tanpa mentionedJid)
          await sock.relayMessage(jid, broadcastContent, {});
          
          // Delay 1,5 detik untuk keamanan ekstra agar tidak terdeteksi spam
          await new Promise(resolve => setTimeout(resolve, 1500)); 
        } catch (err) {
          console.error(`❌ Gagal mengirim ke ${jid}:`, err);
        }
      }

      await sock.sendMessage(id, { text: '✅ Broadcast (No Tag) selesai dikirim.' }, { quoted: msg });

    } catch (error) {
      console.error('Error Broadcast No Tag Command:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat broadcast.' }, { quoted: msg });
    }
  },
};

// [berhasil] broadcast reply without tag-all ✓
