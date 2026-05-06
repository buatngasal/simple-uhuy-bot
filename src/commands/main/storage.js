const storageLib = require('../../lib/storage');

module.exports = {
  name: 'storage',
  async execute(sock, msg, args) {
    const list = storageLib.list();
    const dbSize = storageLib.getDatabaseSize(); // Ambil ukuran file
    const id = msg.key.remoteJid;

    if (list.length === 0) {
      return sock.sendMessage(id, { text: '📂 *Storage Global Kosong*' }, { quoted: msg });
    }

    const sortedList = list.sort();
    let menuText = "📂 *- STORAGE GLOBAL -*\n";
    menuText += "━━━━━━━━━━━━━━━━━━━━\n\n";
    
    sortedList.forEach((v, i) => {
      menuText += `• *${v}*\n`;
    });

    menuText += "\n━━━━━━━━━━━━━━━━━━━━\n";
    menuText += `📝 *Total* : *${sortedList.length}* *Files*\n`;
    menuText += `💾 *Size* : *${dbSize}*\n`; // Menampilkan ukuran file
    menuText += `\n_Ketik nama file langsung untuk memanggil._`;

    return await sock.sendMessage(id, { text: menuText }, { quoted: msg });
  }
};

// [berhasil] fitur storage untuk melihat list pesan media dan memanggilnya tanpa prefix ✓
