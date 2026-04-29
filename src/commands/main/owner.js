const { ownerNumber } = require('../../../config');
const { botName } = require('../../../config');
const own = ownerNumber[0]; // pilih nomor owner yang pertama (index 0)
const name = botName; // nama bot

module.exports = {
  name: 'owner',
  description: 'Menampilkan info dan kontak owner',
  async execute(sock, msg, args) {
    // 1. Kirim Pesan Teks Informasi
    const infoText = `*🤖 INFO OWNER BOT*

◦ *Nomor* : wa.me/${own}
◦ *Nama* : ${name}
◦ *GitHub* : github.com/buatngasal/simple-uhuy-bot

_Dikembangkan oleh ${name}_`;

    await sock.sendMessage(msg.key.remoteJid, { text: infoText }, { quoted: msg });

    // 2. Kirim File Kontak (vCard)
    const vcard = 'BEGIN:VCARD\n'
        + 'VERSION:3.0\n'
        + `FN:${name}\n` 
        + `ORG:Owner ${name};\n`
        + `TEL;type=CELL;type=VOICE;waid=${own}:+${own}\n`
        + 'END:VCARD';

    await sock.sendMessage(
        msg.key.remoteJid,
        { 
            contacts: { 
                displayName: `${name}`, 
                contacts: [{ vcard }] 
            }
        }
    );
  },
};

// [berhasil] owner: tampilkan info dan kirim vcard ✓
