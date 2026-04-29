const { aiScraper } = require('../../lib/scraper-ai');
const { commandPrefix } = require('../../../config');

module.exports = {
    name: 'ai',
    description: 'Tanya AI via ChatGPT',
    usage: `${commandPrefix}ai <pertanyaan>`,
    async execute(sock, msg, args) {
        const query = args.join(' ');
        if (!query) return sock.sendMessage(msg.key.remoteJid, { text: `*Contoh* : ${commandPrefix}ai apa itu cinta?` }, { quoted: msg });

        await sock.sendMessage(msg.key.remoteJid, { text: '⌛ Sedang memproses jawaban...' }, { quoted: msg });

        try {
            const result = await aiScraper(query);

            if (!result) {
                return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Tidak ada respon dari AI.' }, { quoted: msg });
            }

            await sock.sendMessage(msg.key.remoteJid, { text: result }, { quoted: msg });

        } catch (error) {
            console.error("AI Error:", error.message);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Gagal memproses jawaban.' 
            }, { quoted: msg });
        }
    }
};

// [berhasil] fitur ai dari chat-gpt ✓
