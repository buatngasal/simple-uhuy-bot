const { ownerNumber } = require('../../../config');

module.exports = {
  name: 'owner',
  description: 'Menampilkan info dan kartu kontak owner',
  async execute(sock, msg, args) {
    // 1. Kirim Pesan Teks Informasi
    const infoText = `*🤖 Bot Owner Information*
    
📱 Number: wa.me/${ownerNumber}
👤 Name: Uhuy-Bot
🌐 GitHub: github.com/buatngasal/simple-uhuy-bot

_Developed by Uhuy-Bot_`;

    await sock.sendMessage(msg.key.remoteJid, { text: infoText }, { quoted: msg });

    // 2. Kirim File Kontak (vCard)
    const vcard = 'BEGIN:VCARD\n'
        + 'VERSION:3.0\n'
        + 'FN:Uhuy-Bot\n' 
        + 'ORG:Owner Uhuy-Bot;\n'
        + `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n`
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

// [fix] owner: display info and send vcard ✓
