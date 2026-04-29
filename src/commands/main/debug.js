const { getContentType, downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'debug',
  async execute(sock, msg) {
    const id = msg.key.remoteJid;
    const context = msg.message?.extendedTextMessage?.contextInfo;
    
    // Target pesan: Reply atau pesan sendiri
    const targetMessage = context?.quotedMessage || msg.message;
    const type = getContentType(targetMessage);
    const content = targetMessage[type];

    let extraMeta = '';
    let downloadStatus = '';

    // Daftar tipe media yang bisa didownload
    const mediaTypes = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage'];

    if (mediaTypes.includes(type)) {
      // 1. Cek Metadata
      const sizeMB = content.fileLength ? (Number(content.fileLength) / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown';
      
      // 2. Simulasi Download untuk cek integritas file
      try {
        const stream = await downloadContentFromMessage(content, type.replace('Message', ''));
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        downloadStatus = buffer.length > 0 ? '✅ Berhasil diunduh (File Aman)' : '❌ File Kosong';
      } catch (e) {
        downloadStatus = '❌ Gagal Unduh (Media Expired/Server Error)';
      }

      extraMeta = `*📊 METADATA MEDIA*\n` +
                  `> 📂 Nama: ${content.fileName || 'N/A'}\n` +
                  `> 📑 Mime: ${content.mimetype || 'N/A'}\n` +
                  `> ⚖️ Ukuran: ${sizeMB}\n` +
                  `> 📥 Status: ${downloadStatus}\n\n`;
    }

    const quoteTarget = context?.quotedMessage ? {
      key: { remoteId: id, fromMe: context.participant === sock.user.id, id: context.stanzaId, participant: context.participant },
      message: context.quotedMessage
    } : msg;

    const responseText = `🔍 *DEBUG INFO*\n` +
                         `*Tipe:* \`${type}\`\n\n` + 
                         extraMeta + 
                         `*Full JSON:* \n\`\`\`${JSON.stringify(targetMessage, null, 2)}\`\`\``;

    await sock.sendMessage(id, { text: responseText }, { quoted: quoteTarget });
  }
};

// [berhasil] fitur debug ✓
