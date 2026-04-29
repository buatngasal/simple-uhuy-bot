const { lyricsScraper } = require('../../lib/scraper-lyrics');
const { commandPrefix } = require('../../../config');

module.exports = {
    name: 'lirik',
    description: 'Mencari lirik lagu',
    usage: `${commandPrefix}lirik <judul lagu>`,
    async execute(sock, msg, args) {
        const query = args.join(' ');
        if (!query) return sock.sendMessage(msg.key.remoteJid, { text: `*Contoh* : ${commandPrefix}lirik mahalini sial` }, { quoted: msg });

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: `🔍 Sedang mencari lirik: *${query}*...` }, { quoted: msg });

            const data = await lyricsScraper(query);

            if (!data) {
                return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Lirik tidak ditemukan.' }, { quoted: msg });
            }

            const finalMessage = `*- LIRIK LAGU -*\n\n*Judul*: ${data.title}\n───────────────────\n\n${data.content}`;
            await sock.sendMessage(msg.key.remoteJid, { text: finalMessage }, { quoted: msg });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Terjadi kesalahan sistem.` }, { quoted: msg });
        }
    }
};

// [berhasil] fitur lirik dari chordtela ✓
