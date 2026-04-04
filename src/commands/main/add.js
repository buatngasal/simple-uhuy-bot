module.exports = {
  name: 'add',
  description: 'Add a member to the group (admin only)',
  async execute(sock, msg, args) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'This command can only be used in groups.' }, { quoted: msg });
    }
    
    if (!args[0]) return sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a phone number to add.' }, { quoted: msg });
    
    const number = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    
    try {
      // PERBAIKAN DI SINI: Gunakan groupParticipantsUpdate dengan action 'add'
      await sock.groupParticipantsUpdate(msg.key.remoteJid, [number], "add");
      
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `Added @${args[0].replace(/[^0-9]/g, '')}`, 
        mentions: [number] 
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to add member: ' + e.message }, { quoted: msg });
    }
  },
};

// [fix] fitur add member ✓