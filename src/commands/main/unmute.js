module.exports = {
  name: 'unmute',
  description: 'Buka grup (khusus admin).',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Perintah ini hanya dapat digunakan di dalam grup' }, { quoted: msg });
    }
    try {
      await sock.groupSettingUpdate(msg.key.remoteJid, 'not_announcement');
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ Grup telah dibuka (semua anggota dapat mengirim pesan).' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat membuka grup: ' + e.message }, { quoted: msg });
    }
  },
}; 

// [berhasil] fitur unmute (buka group) ✓