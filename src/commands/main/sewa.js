const { ownerNumber } = require('../../../config');
const { botName } = require('../../../config');
const own = ownerNumber[0]; 
const name = botName; 

module.exports = {
  name: 'sewa',
  description: 'Menampilkan info sewa bot dan kontak owner',
  async execute(sock, msg, args) {
    // Ambil nama user (pushName)
    const userName = msg.pushName || 'Kak';

    // Fungsi untuk mendapatkan sapaan berdasarkan waktu
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 11) return 'Selamat pagi';
      if (hour >= 11 && hour < 15) return 'Selamat siang';
      if (hour >= 15 && hour < 18) return 'Selamat sore';
      return 'Selamat malam';
    };

    const greeting = getGreeting();

    // 1. Kirim Pesan Teks Informasi dengan sapaan & nama personal
    const infoText = `*🤖 INFO SEWA BOT*

${greeting}, ${userName}.

*Harga 10k = 1 bulan* atau sampai dengan nomor ini di banned (tidak ada fitur auto-kick).

Kirim *DANA* ke nomor *6285857840057* untuk *1* grup.

Akan kami proses dalam *1x24 jam* terimakasih.

*HUBUNGI NOMOR BERIKUT UNTUK INFORMASI LEBIH LANJUT.*`;

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

// [berhasil] sewa bot: tampilkan info dan kirim vcard ✓
