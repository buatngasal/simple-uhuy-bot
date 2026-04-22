const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../welcome.json');
const defaultPP = path.join(__dirname, '../../uploads/foto-profile.jpg'); 

async function handleGroupUpdate(sock, update) {
  const { id, participants, action } = update;
  
  let db = {};
  try { 
    db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {}; 
  } catch { return; }

  const settings = db[id];
  if (!settings || !settings.status) return;

  const groupMetadata = await sock.groupMetadata(id);
  const groupName = groupMetadata.subject;

  for (let num of participants) {
    let rawText = '';
    let imageSource;

    // Logika pengambilan gambar
    try {
      const ppUrl = await sock.profilePictureUrl(num, 'image');
      imageSource = { url: ppUrl }; // Gunakan URL jika ada PP
    } catch {
      // Jika gagal/privasi, gunakan file lokal
      imageSource = fs.readFileSync(defaultPP); // Load file lokal sebagai Buffer
    }

    if (action === 'add') {
      rawText = settings.welcome || 'Selamat datang @user!';
    } else if (action === 'remove') {
      rawText = settings.left || 'Selamat tinggal @user!';
    }

    if (rawText) {
      const message = rawText
        .replace(/@user/g, `@${num.split('@')[0]}`)
        .replace(/@group/g, groupName);

      await sock.sendMessage(id, { 
        image: imageSource, // Bisa berupa {url: ...} atau Buffer file lokal
        caption: message, 
        mentions: [num] 
      });
    }
  }
}

module.exports = { handleGroupUpdate };
