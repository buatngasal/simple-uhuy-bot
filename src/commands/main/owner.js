const { ownerNumber } = require('../../../config');
const own = ownerNumber[0]; // pilih nomor owner yang pertama

module.exports = {
  name: 'owner',
  description: 'Menampilkan info dan kontak owner',
  async execute(sock, msg, args) {
    // 1. Kirim Pesan Teks Informasi
    const infoText = `*🤖 INFO OWNER BOT*

◦ *Nomor* : wa.me/${own}
◦ *Nama* : Uhuy-Bot
◦ *GitHub* : github.com/buatngasal/simple-uhuy-bot

_Dikembangkan oleh Uhuy-Bot_`;

    await sock.sendMessage(msg.key.remoteJid, { text: infoText }, { quoted: msg });

    // 2. Kirim File Kontak (vCard)
    const vcard = 'BEGIN:VCARD\n'
        + 'VERSION:3.0\n'
        + 'FN:Uhuy-Bot\n' 
        + 'ORG:Owner Uhuy-Bot;\n'
        + `TEL;type=CELL;type=VOICE;waid=${own}:+${own}\n`
        + 'END:VCARD';

    await sock.sendMessage(
        msg.key.remoteJid,
        { 
            contacts: { 
                displayName: 'Uhuy-Bot', 
                contacts: [{ vcard }] 
            }
        }
    );
  },
};

// [berhasil] owner: tampilkan info dan kirim vcard ✓
