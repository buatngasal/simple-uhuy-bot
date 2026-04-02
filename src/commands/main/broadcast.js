module.exports = {
  name: 'broadcast',
  description: 'Broadcast a message to all chats (owner only)',
  async execute(sock, msg, args) {
    if (!args.length) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a message to broadcast.' }, { quoted: msg });
    const text = args.join(' ');
    const chats = await sock.groupFetchAllParticipating();
    for (const jid of Object.keys(chats)) {
      const metadata = await sock.groupMetadata(msg.key.remoteJid);
      const members = metadata.participants.map(p => p.id);
      await sock.sendMessage(jid, { text: `[Broadcast]\n${text}`, mentions: members });
    }
    await sock.sendMessage(msg.key.remoteJid, { text: 'Broadcast sent.' }, { quoted: msg });
  },
}; 

// [fix] [ B R O A D C A S T ]