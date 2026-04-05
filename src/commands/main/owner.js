const { ownerNumber } = require('../../../config');

module.exports = {
  name: 'owner',
  description: 'Show owner info',
  async execute(sock, msg, args) {
    const info = `*🤖 Bot Owner Information*
    
📱 Number: wa.me/${ownerNumber}
👤 Name: Uhuy-Bot
🌐 GitHub: github.com/buatngasal
💬 Note: Nothing last forever, we can change the future [Alucrot 1945]

_Bot created with ❤️ by Uhuy-Bot_`;
    await sock.sendMessage(msg.key.remoteJid, { text: info }, { quoted: msg });
  },
}; 

// [fix] fitur info owner ✓