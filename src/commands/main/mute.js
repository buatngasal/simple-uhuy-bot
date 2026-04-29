module.exports = {
  name: 'mute',
  description: 'Tutup grup (khusus admin)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Perintah ini hanya dapat digunakan di dalam grup' }, { quoted: msg });
    }
    try {
      await sock.groupSettingUpdate(msg.key.remoteJid, 'announcement');
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ Grup telah ditutup (hanya admin yang dapat mengirim pesan).' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat menutup grup: ' + e.message }, { quoted: msg });
    }
  },
}; 

// [berhasil] fitur mute (tutup group) ✓
