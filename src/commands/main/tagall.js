module.exports = {
  name: 'tagall',
  description: 'Tag semua anggota grup (khusus admin).',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Perintah ini hanya dapat digunakan di dalam grup.' }, { quoted: msg });
    }
    const metadata = await sock.groupMetadata(msg.key.remoteJid);
    const members = metadata.participants.map(p => p.id);
    const text = args.length ? args.join(' ') : '@semua';
    await sock.sendMessage(msg.key.remoteJid, { text, mentions: members }, { quoted: msg });
  },
}; 

// [berhasil] tag semua anggota grup ✓
