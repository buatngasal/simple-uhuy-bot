const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../../menfess.json');
const { commandPrefix } = require('../../../config');

// Konfigurasi Durasi (1 jam = 3600000 ms)
const EXPIRY_TIME = 1 * 60 * 60 * 1000; 

function load() { 
    try { 
        let data = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : { sessions: {}, msgLinks: {} };
        return data;
    } catch (e) { return { sessions: {}, msgLinks: {} }; } 
}

function save(data) { 
    try { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); } 
    catch (e) { console.error('Save error:', e); } 
}

// Fungsi untuk membersihkan sesi yang sudah basi (expired)
function cleanupExpiredSessions(db, sock) {
    const now = Date.now();
    let changed = false;

    Object.entries(db.sessions).forEach(([id, session]) => {
        if (now - session.lastChat > EXPIRY_TIME) {
            const targetJid = session.target;
            
            // Hapus kedua belah pihak
            delete db.sessions[id];
            delete db.sessions[targetJid];
            
            // Kirim notifikasi otomatis
            sock.sendMessage(id, { text: '⏳ *Sesi menfess telah berakhir otomatis karena tidak ada aktivitas selama 1 jam.*' }).catch(() => {});
            sock.sendMessage(targetJid, { text: '⏳ *Sesi menfess telah berakhir otomatis karena tidak ada aktivitas selama 1 jam.*' }).catch(() => {});
            
            changed = true;
        }
    });

    if (changed) save(db);
}

module.exports = {
    name: 'menfess',
    async execute(sock, msg, args) {
        const id = msg.key.remoteJid;
        let db = load();
        cleanupExpiredSessions(db, sock); // Bersihkan yang expired setiap kali command dipanggil

        const input = args.join(' ').trim();

        // STOP SESSION
        if (input.toLowerCase() === 'stop') {
            const session = db.sessions[id];
            if (!session) return sock.sendMessage(id, { text: '❌ Tidak ada sesi aktif.' }, { quoted: msg });

            const target = session.target;
            delete db.sessions[id];
            delete db.sessions[target];
            save(db);

            await sock.sendMessage(target, { text: '📴 *Sesi dihentikan oleh lawan bicara.*' });
            return sock.sendMessage(id, { text: '✅ *Sesi berhasil dihapus.*' }, { quoted: msg });
        }

        // START NEW SESSION
        const [targetNum, ...pesanArr] = input.split('|');
        const pesan = pesanArr.join('|').trim();

        if (!targetNum || !pesan) return sock.sendMessage(id, { text: `Format: *${commandPrefix}menfess nomor|pesan*` }, { quoted: msg });
        if (db.sessions[id]) return sock.sendMessage(id, { text: `❌ Sesi masih aktif. Ketik *${commandPrefix}menfess stop*.` }, { quoted: msg });

        let targetJid = targetNum.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        try {
            const sent = await sock.sendMessage(targetJid, { 
                text: `*📩 Menfess Baru:*\n\n"${pesan}"\n\n_Balas untuk mengobrol atau ketik *${commandPrefix}menfess stop*._` 
            });

            const timestamp = Date.now();
            db.sessions[id] = { target: targetJid, lastChat: timestamp };
            db.sessions[targetJid] = { target: id, lastChat: timestamp };
            db.msgLinks[sent.key.id] = id; 
            
            save(db);
            return sock.sendMessage(id, { text: '✅ *Terkirim!* Sesi akan otomatis berakhir jika tidak ada chat selama 1 jam.' }, { quoted: msg });
        } catch (e) {
            return sock.sendMessage(id, { text: '❌ Gagal mengirim.' }, { quoted: msg });
        }
    },

    async handleReply(sock, msg, body) {
        const id = msg.key.remoteJid;
        let db = load();
        cleanupExpiredSessions(db, sock);

        const session = db.sessions[id];

        if (session) {
            if (body.toLowerCase().startsWith(`${commandPrefix}menfess stop`)) return false;

            // Update waktu terakhir chat agar tidak expired
            db.sessions[id].lastChat = Date.now();
            db.sessions[session.target].lastChat = Date.now();
            save(db);

            await sock.sendMessage(session.target, { text: `*Menfess:* \n\n${body}` });
            return true;
        }

        // Handler untuk reply pertama kali
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
        if (quotedMsg && db.msgLinks[quotedMsg.stanzaId]) {
            const originSender = db.msgLinks[quotedMsg.stanzaId];
            const timestamp = Date.now();
            
            db.sessions[id] = { target: originSender, lastChat: timestamp };
            db.sessions[originSender] = { target: id, lastChat: timestamp };
            save(db);

            await sock.sendMessage(originSender, { text: `*Menfess:* \n\n${body}` });
            return true;
        }

        return false;
    }
};

// [fix] fitur menfess ✓