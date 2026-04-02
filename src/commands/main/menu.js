const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'menu',
  description: 'Show command list',
  async execute(sock, msg, args) {
    // Fungsi untuk mengambil file secara rekursif
    const getFilesRecursively = (dir, fileList = []) => {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          getFilesRecursively(filePath, fileList);
        } else {
          // Hanya ambil nama file (tanpa ekstensi .js jika perlu)
          const name = path.parse(file).name;
          fileList.push(`${commandPrefix}${name}`);
        }
      });
      return fileList;
    };

    // Tentukan path ke direktori src/commands/main
    // Sesuaikan path ini dengan posisi file allmenu.js
    const dirPath = path.join(__dirname, '..', '..', 'commands', 'main');
    
    let commandFiles = [];
    try {
      commandFiles = getFilesRecursively(dirPath);
    } catch (err) {
      console.error("Gagal membaca direktori:", err);
    }

    const menuList = commandFiles.map(cmd => `• ${cmd}`).join('\n');

    const menu = `🦚 *Uhuy-Bot*

*All Menu* 🍃
${menuList}

Ketik *${commandPrefix}help <command>* untuk detail.`;

    await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
  },
};

// [fix] fitur menu