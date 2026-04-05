const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'menu-img',
  description: 'Show command list with a cat image',
  async execute(sock, msg, args) {
    // 1. Fungsi rekursif untuk mengambil semua command
    const getFilesRecursively = (dir, fileList = []) => {
      if (!fs.existsSync(dir)) return fileList;
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          getFilesRecursively(filePath, fileList);
        } else {
          const name = path.parse(file).name;
          fileList.push(`${commandPrefix}${name}`);
        }
      });
      return fileList;
    };

    // 2. Tentukan path direktori commands
    const dirPath = path.join(__dirname, '..', '..', 'commands', 'main');
    
    let commandFiles = [];
    try {
      commandFiles = getFilesRecursively(dirPath);
    } catch (err) {
      console.error("Gagal membaca direktori:", err);
    }

    const menuList = commandFiles.map(cmd => `• ${cmd}`).join('\n');

    // 3. Susun teks menu
    const menuText = `🦚 *Uhuy-Bot Menu*

*All Menu* 🍃
${menuList}

Ketik *${commandPrefix}help <command>* untuk detail.`;

    try {
      // 4. Ambil gambar kucing random
      const { data } = await axios.get('https://api.thecatapi.com/v1/images/search');
      const imageUrl = data[0].url;

      // 5. Kirim gambar dengan caption menu
      await sock.sendMessage(
        msg.key.remoteJid, 
        { 
          image: { url: imageUrl }, 
          caption: menuText 
        }, 
        { quoted: msg }
      );
    } catch (e) {
      // Fallback jika API kucing error, tetap kirim menu dalam bentuk teks
      console.error("Gagal mengambil gambar kucing:", e);
      await sock.sendMessage(msg.key.remoteJid, { text: menuText }, { quoted: msg });
    }
  },
};

// [fix] fitur menu gambar kucing ✓