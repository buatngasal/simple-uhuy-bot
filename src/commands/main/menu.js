const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'menu',
  description: 'Menampilkan daftar perintah bot yang tersedia',
  async execute(sock, msg, args) {
    const getCommandsRecursively = (dir, commandList = []) => {
      const files = fs.readdirSync(dir);
      
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        
        if (fs.statSync(filePath).isDirectory()) {
          getCommandsRecursively(filePath, commandList);
        } else if (file.endsWith('.js')) {
          try {
            const command = require(filePath);
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

    const dirPath = path.join(__dirname, '..', '..', '..', 'src', 'commands', 'main');
    
    let commandNames = [];
    try {
      commandNames = getCommandsRecursively(dirPath);
      commandNames = [...new Set(commandNames)].sort();
    } catch (err) {
      console.error("Gagal membaca direktori:", err);
    }

    // Hitung total perintah
    const totalCommands = commandNames.length;
    const menuList = commandNames.map(cmd => `${cmd}`).join('\n');

    const menu = `🦚 *Uhuy-Bot Menu*

*All Menu* [ *${commandPrefix}* ] 🍃

${menuList}

💾 *Total* : *${totalCommands}*
Ketik *${commandPrefix}help <command>* untuk detail.`;

    await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
  },
};

// [berhasil] fitur menu dengan total commands ✓
