const { getContentType } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'bctag',
  description: 'Broadcast media/pesan ke semua grup dengan tag all',
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;
      
      // Ambil context info dari pesan yang di-reply (quoted)
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quoted) {
        return sock.sendMessage(id, { text: '❌ Silakan reply pesan atau media yang ingin di-broadcast!' }, { quoted: msg });
      }

      // Mendapatkan tipe pesan dan kontennya
      const type = getContentType(quoted);
      const content = quoted[type];

      // Ambil daftar semua grup yang diikuti
      const chats = await sock.groupFetchAllParticipating();
      const groups = Object.keys(chats);

      await sock.sendMessage(id, { text: `⏳ Mengirim broadcast ke ${groups.length} grup...` }, { quoted: msg });

      for (const jid of groups) {
        try {
          // Ambil metadata grup untuk mendapatkan daftar member (mentions)
          const metadata = await sock.groupMetadata(jid);
          const members = metadata.participants.map(p => p.id);

          // Tambahkan mentions ke dalam contextInfo konten yang akan dikirim
          // Kita clone konten agar tidak merusak objek asli
          const broadcastContent = { ...quoted };
          
          // Pastikan properti contextInfo ada untuk menampung mentions
          if (broadcastContent[type]) {
            broadcastContent[type].contextInfo = {
              ...(broadcastContent[type].contextInfo || {}),
              mentionedJid: members
            };
          }

          // Kirim menggunakan relayMessage agar format media tetap asli
          await sock.relayMessage(jid, broadcastContent, {});
          
          // Delay sedikit untuk menghindari spam filter/ban (opsional)
          await new Promise(resolve => setTimeout(resolve, 1000)); 
          
        } catch (err) {
          console.error(`Gagal mengirim ke ${jid}:`, err);
        }
      }

      await sock.sendMessage(id, { text: '✅ Broadcast selesai dikirim ke semua grup.' }, { quoted: msg });

    } catch (error) {
      console.error('Error Broadcast Tag Command:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat broadcast.' }, { quoted: msg });
    }
  },
};

// [fix] broadcast tag
