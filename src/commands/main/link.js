module.exports = {
  name: 'link',
  description: 'Dapatkan link grup (bot wajib jadi admin)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Hanya untuk grup.' }, { quoted: msg });
    }
    try {
      const code = await sock.groupInviteCode(msg.key.remoteJid);
      const link = `https://chat.whatsapp.com/${code}`;
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ *Link* : ' + link }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal ambil link: ' + e.message }, { quoted: msg });
    }
  },
}; 

// [berhasil] fitur mengambil link group ✓