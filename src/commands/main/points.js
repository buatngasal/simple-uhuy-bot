const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../../points.json');
const { commandPrefix } = require('../../../config');

function load() {
  try {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath));
  } catch (error) {
    console.error('Error loading points database:', error);
    return {};
  }
}

function save(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving points database:', error);
  }
}

function addPoint(jid, user, amount = 1) {
  if (!user || user.endsWith('@g.us')) return; // Cegah grup masuk sebagai user
  try {
    const db = load();
    if (!db[jid]) db[jid] = {};
    if (!db[jid][user]) db[jid][user] = 0;
    db[jid][user] += amount;
    save(db);
  } catch (error) {
    console.error('Error adding point:', error);
  }
}

function getPoint(jid, user) {
  try {
    const db = load();
    return db[jid]?.[user] || 0;
  } catch (error) {
    console.error('Error getting point:', error);
    return 0;
  }
}

function getLeaderboard(jid, top = 10) {
  try {
    const db = load();
    if (!db[jid]) return [];
    return Object.entries(db[jid])
      .sort((a, b) => b[1] - a[1])
      .slice(0, top);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

function cleanupDatabase() {
  try {
    const db = load();
    let count = 0;

    // Loop setiap JID grup di dalam database
    for (const jid in db) {
      const members = db[jid];
      
      // Cek setiap user di dalam grup tersebut
      for (const user in members) {
        if (user.endsWith('@g.us')) {
          delete db[jid][user]; // Hapus entri yang mengandung @g.us
          count++;
        }
      }
    }

    if (count > 0) {
      save(db);
      console.log(`✅ Berhasil membersihkan ${count} entri @g.us dari database.`);
    } else {
      console.log('ℹ️ Tidak ditemukan data @g.us yang perlu dibersihkan.');
    }
    return count;
  } catch (error) {
    console.error('❌ Gagal membersihkan database:', error);
    return 0;
  }
}

module.exports = {
  addPoint,
  getPoint,
  getLeaderboard,
  name: 'points',
  description: 'Cek poin kamu atau leaderboard grup',
  usage: `${commandPrefix}points <top|leaderboard>`,
  async execute(sock, msg, args) {
    try {
      const id = msg.key.remoteJid;
      const action = args[0]?.toLowerCase();

      // 1. Cek jika user ingin melihat leaderboard
      if (action === 'top' || action === 'leaderboard') {
        const top = getLeaderboard(id, 10);
        // Tambahkan filter .filter(([user]) => !user.endsWith('@g.us')) untuk jaga-jaga data lama masih ada
        const filteredTop = top.filter(([user]) => !user.endsWith('@g.us'));
        
        if (!filteredTop.length) return sock.sendMessage(id, { text: 'Belum ada poin.' }, { quoted: msg });
        
        let text = `*🏆 LEADERBOARD GRUP 🏆*\n\n`;
        filteredTop.forEach(([user, point], i) => {
          text += `${i + 1}. @${user.split('@')[0]} : *${point}* poin\n`;
        });
        return sock.sendMessage(id, { text, mentions: filteredTop.map(([u]) => u) }, { quoted: msg });
      }

      // CLEANUP DATABASE
      if (action === 'cleanup') {
        const deletedCount = cleanupDatabase();
        return sock.sendMessage(id, { 
          text: `🧹 Database dibersihkan! Menghapus ${deletedCount} data sampah.` 
        }, { quoted: msg });
      }

      // 2. Ambil target: Pastikan TIDAK mengambil @g.us
      let target;
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      
      if (mentioned && !mentioned.endsWith('@g.us')) {
        target = mentioned;
      } else if (action && action.includes('@') && !action.endsWith('@g.us')) {
        target = action;
      } else {
        // Ambil participant (pengirim di grup), jika tidak ada baru ambil remoteJid 
        // tapi validasi agar bukan grup
        target = msg.key.participant || msg.key.remoteJid;
      }

      // Validasi Akhir: Jika target masih berupa grup, jangan tampilkan/proses
      if (target.endsWith('@g.us')) {
        return sock.sendMessage(id, { text: '❌ Tidak dapat mengecek poin grup.' }, { quoted: msg });
      }

      const point = getPoint(id, target);
      return sock.sendMessage(id, { 
        text: `Points @${target.split('@')[0]} : *${point}*`, 
        mentions: [target] 
      }, { quoted: msg });

    } catch (error) {
      console.error('Points command error:', error);
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: Failed to process points command.' }, { quoted: msg });
    }
  }
};

// [fix] cek points + leaderboard + cleanup ✓
