const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'broadcast',
  description: 'Siaran ke semua chat',
  async execute(sock, msg, args) {
    if (!args.length) return sock.sendMessage(msg.key.remoteJid, { text: `*Contoh* : ${commandPrefix}broadcast halo semua` }, { quoted: msg });
    const text = args.join(' ');
    const chats = await sock.groupFetchAllParticipating();
    for (const jid of Object.keys(chats)) {
      const metadata = await sock.groupMetadata(msg.key.remoteJid);
      const members = metadata.participants.map(p => p.id);
      await sock.sendMessage(jid, { text: `[Broadcast]\n${text}`, mentions: members });
    }
    await sock.sendMessage(msg.key.remoteJid, { text: '✅ Pesan siaran telah berhasil dikirim.' }, { quoted: msg });
  },
}; 

// [berhasil] broadcast text tag-all ✓
