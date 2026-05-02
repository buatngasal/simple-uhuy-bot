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

    // Image retrieval logic
    try {
      const ppUrl = await sock.profilePictureUrl(num, 'image');
      imageSource = { url: ppUrl }; // Use URL if profile picture exists
    } catch {
      // Fallback to local file if failed or private
      imageSource = fs.readFileSync(defaultPP); // Load local file as Buffer
    }

    const sourceLink = 'https://github.com/buatngasal/simple-uhuy-bot';

    let titleReply = '';
    if (action === 'add') {
      titleReply = '◦ W E L C O M E ◦';
      rawText = settings.welcome || 'Selamat datang @user!';
    } else if (action === 'remove') {
      titleReply = '◦ G O O D B Y E ◦';
      rawText = settings.left || 'Selamat tinggal @user!';
    }

    if (rawText) {
      const message = rawText
        .replace(/@user/g, `@${num.split('@')[0]}`)
        .replace(/@group/g, groupName);

        await sock.sendMessage(id, {
          text: message,
          contextInfo: {
            externalAdReply: {
              title: titleReply,
              body: `Sistem Notifikasi Grup`,
              mediaType: 1,
              renderLargerThumbnail: true,
              showAdAttribution: true,
              thumbnail: Buffer.isBuffer(imageSource) ? imageSource : null,
              thumbnailUrl: !Buffer.isBuffer(imageSource) ? imageSource.url : null,
              sourceUrl: sourceLink
            }
          },
          mentions: [num] 
        });
    }
  }
}

module.exports = { handleGroupUpdate };
