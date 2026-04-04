// commands yang pertama kali di call oleh index.js
const { commandPrefix } = require('../../../config');
module.exports = {
  name: 'welcome',
  description: 'Check bot response',
  async execute(sock, msg, args) {
    await sock.sendMessage(msg.key.remoteJid, { text: `Ketik *${commandPrefix}menu* untuk melihat fitur bot` }, { quoted: msg });
  },
}; 

// [fix] welcome ✓