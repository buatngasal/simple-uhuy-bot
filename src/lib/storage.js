const fs = require('fs');
const path = require('path');
const { generateForwardMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

const dbPath = path.join(__dirname, '../../storage.json');

function load() {
  try {
    return fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};
  } catch (e) { return {}; }
}

function save(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (e) { console.error('Storage Save Error:', e); }
}

module.exports = {
  async handle(sock, msg, body) {
    if (!body) return false;
    const db = load();
    const trigger = body.trim().toLowerCase();

    if (db[trigger]) {
      try {
        const stored = db[trigger];
        
        // Wrap back into a minimal valid message structure for forwarding
        const fullMsg = {
          key: { 
            remoteJid: msg.key.remoteJid, 
            fromMe: false, 
            id: 'STORAGE' 
          },
          message: stored.message
        };

        const forward = generateForwardMessageContent(fullMsg, false);
        const m = generateWAMessageFromContent(msg.key.remoteJid, forward, { 
          userJid: sock.user.id, 
          quoted: msg 
        });

        await sock.relayMessage(msg.key.remoteJid, m.message, { messageId: m.key.id });
        return true;
      } catch (error) {
        console.error('Error sending stored media:', error);
        return false;
      }
    }
    return false;
  },

  saveFile(name, quotedMsg) {
    if (!name || !quotedMsg) throw new Error('Invalid data.');

    const db = load();
    
    // Store only the message content into the message property
    db[name.toLowerCase()] = {
      message: quotedMsg
    };
    
    save(db);
    return true;
  },

  deleteFile(name) {
    const db = load();
    const target = name.toLowerCase();
    if (db[target]) {
      delete db[target];
      save(db);
      return true;
    }
    return false;
  },

  list() {
    return Object.keys(load());
  },

  getDatabaseSize() {
    try {
      if (!fs.existsSync(dbPath)) return "0 B";
      const stats = fs.statSync(dbPath);
      const bytes = stats.size;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Byte';
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    } catch (e) {
      return "Calculation failed";
    }
  }
  
};
