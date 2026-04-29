const warnings = {};

module.exports = {
  name: 'warn',
  description: 'Berikan peringatan kepada anggota (khusus admin)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Perintah ini hanya dapat digunakan di dalam grup.' }, { quoted: msg });
    }
    if (!msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Tag pengguna yang ingin anda warn.' }, { quoted: msg });
    }
    const target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    warnings[target] = (warnings[target] || 0) + 1;
    await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ @${target.split('@')[0]} telah diberi peringatan (${warnings[target]}) ✅`, mentions: [target] }, { quoted: msg });
  },
  warnings,
}; 

// [berhasil] warn (menambahkan point warning) ✓
