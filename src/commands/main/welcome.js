const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../../welcome.json');
const { commandPrefix } = require('../../../config');

function load() {
  try { return fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {}; } catch { return {}; }
}

function save(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'welcome',
  description: 'Pengaturan welcome/bye kustom',
  usage: `${commandPrefix}welcome on/off | set welcome <teks> | set left <teks>`,
  async execute(sock, msg, args) {
    const id = msg.key.remoteJid;
    if (!id.endsWith('@g.us')) return sock.sendMessage(id, { text: 'Fitur ini hanya untuk grup!' });

    const db = load();
    if (!db[id]) db[id] = { status: false, welcome: 'Selamat datang @user!', left: 'Selamat tinggal @user!' };

    const action = args[0]?.toLowerCase();
    
    if (action === 'on') {
      db[id].status = true;
      save(db);
      return sock.sendMessage(id, { text: '✅ Welcome active.' });
    } 
    
    if (action === 'off') {
      db[id].status = false;
      save(db);
      return sock.sendMessage(id, { text: '❌ Welcome disabled.' });
    }

    if (action === 'set') {
      const type = args[1]?.toLowerCase(); // 'welcome' atau 'left'
      const text = args.slice(2).join(' ');

      if (!['welcome', 'left'].includes(type) || !text) {
        return sock.sendMessage(id, { text: `Contoh: ${commandPrefix}welcome set welcome Hai @user, selamat datang di @group!` });
      }

      db[id][type] = text;
      save(db);
      return sock.sendMessage(id, { text: `✅ Pesan ${type} berhasil diperbarui.` });
    }

    return sock.sendMessage(id, { text: `*Format Welcome:*\n- @user (Tag member)\n- @group (Nama grup)\n\n*Command:*\n${commandPrefix}welcome on/off\n${commandPrefix}welcome set welcome <teks>\n${commandPrefix}welcome set left <teks>` });
  }
};
