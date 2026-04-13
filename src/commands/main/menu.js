const fs = require('fs');
const path = require('path');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'menu',
  description: 'Show available bot commands',
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

    // 2. Tentukan path direktori commands dan path gambar thumbnail
    const dirPath = path.join(__dirname, '..', '..', 'commands', 'main');
    const imagePath = path.join(__dirname, '..', '..', '..', 'uploads', 'Uhuybot.jpg');
    
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
      // 4. Baca gambar lokal sebagai Buffer
      const thumbnail = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null;

      // 5. Kirim pesan teks dengan contextInfo externalAdReply
      await sock.sendMessage(
        msg.key.remoteJid, 
        { 
          text: menuText,
          contextInfo: {
            externalAdReply: {
              title: "Uhuy-Bot Multi Device",
              body: "A simple, lightweight bot for everyday use",
              thumbnail: thumbnail,
              sourceUrl: "https://github.com/buatngasal/simple-uhuy-bot",
              mediaType: 1,
              renderLargerThumbnail: true,
              showAdAttribution: true
            }
          }
        }, 
        { quoted: msg }
      );
    } catch (e) {
      console.error("Gagal mengirim menu dengan thumbnail:", e);
      // Fallback jika terjadi error
      await sock.sendMessage(msg.key.remoteJid, { text: menuText }, { quoted: msg });
    }
  },
};

// [fix] fitur menu dengan format dokumen ✓
