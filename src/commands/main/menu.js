const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'menu',
  description: 'Show available bot commands',
  async execute(sock, msg, args) {
    // Fungsi untuk mengambil properti name dari module.exports secara rekursif
    const getCommandsRecursively = (dir, commandList = []) => {
      const files = fs.readdirSync(dir);
      
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        
        if (fs.statSync(filePath).isDirectory()) {
          getCommandsRecursively(filePath, commandList);
        } else if (file.endsWith('.js')) {
          try {
            // Import file secara dinamis
            const command = require(filePath);
            // Ambil name dari module.exports jika tersedia
            if (command.name) {
              commandList.push(`${commandPrefix}${command.name}`);
            }
          } catch (err) {
            console.error(`Gagal memuat file ${file}:`, err);
          }
        }
      });
      return commandList;
    };

    // Tentukan path ke direktori src/commands/main
    const dirPath = path.join(__dirname, '..', '..', '..', 'src', 'commands', 'main');
    
    let commandNames = [];
    try {
      commandNames = getCommandsRecursively(dirPath);
      // Menghapus duplikat dan mengurutkan abjad
      commandNames = [...new Set(commandNames)].sort();
    } catch (err) {
      console.error("Gagal membaca direktori:", err);
    }

    const menuList = commandNames.map(cmd => `${cmd}`).join('\n');

    const menu = `🦚 *Uhuy-Bot Menu*

*All Menu* [ *${commandPrefix}* ] 🍃
${menuList}

Ketik *${commandPrefix}help <command>* untuk detail.`;

    await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
  },
};

// [fix] menu: get menu list from module.exports.name ✓
