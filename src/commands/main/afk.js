const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../../afk.json');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'afk',
  description: 'Set status AFK',
  usage: `${commandPrefix}afk <alasan>`,
  async execute(sock, msg, args) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};
      const reason = args.join(' ') || 'Tanpa alasan';

      db[sender] = { reason, time: Date.now() };
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      
      return sock.sendMessage(msg.key.remoteJid, { 
        text: `✅ *${msg.pushName || 'User'}* sekarang AFK.\nAlasan: _${reason}_` 
      }, { quoted: msg });
    } catch (error) {
      console.error('AFK Command Error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal mengaktifkan AFK.' });
    }
  },
};

// [fix] fitur afk ✓
