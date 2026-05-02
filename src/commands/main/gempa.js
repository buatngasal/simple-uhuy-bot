const axios = require('axios');
const { formatError } = require('../../lib/response-helper');

module.exports = {
  name: 'gempa',
  description: 'Menampilkan data gempa bumi terbaru dari BMKG',
  async execute(sock, msg, args) {
    const url = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
    
    try {

      const response = await axios.get(url);
      const gempa = response.data.Infogempa.gempa;

      if (!gempa) {
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: formatError('Gagal', 'Data gempa tidak ditemukan.') 
        }, { quoted: msg });
      }

      const caption = `⚠️ *- G E M P A -*

📅 *Tanggal* : ${gempa.Tanggal}
⌚ *Waktu* : ${gempa.Jam}
📍 *Koordinat* : ${gempa.Coordinates}
📏 *Magnitudo* : ${gempa.Magnitude} SR
🌊 *Kedalaman* : ${gempa.Kedalaman}
🗺️ *Lokasi* : ${gempa.Wilayah}
📢 *Potensi* : ${gempa.Potensi}
🕒 *Dirasakan* : ${gempa.Dirasakan || '-'}

_Sumber: BMKG Indonesia_`;

      // URL Gambar Peta dari BMKG
      const mapUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}`;

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: caption,
          contextInfo: {
            externalAdReply: {
              title: `${gempa.Wilayah}`,
              body: `Magnitudo: ${gempa.Magnitude} SR | Kedalaman: ${gempa.Kedalaman}`,
              mediaType: 1,
              renderLargerThumbnail: true,
              showAdAttribution: true,
              thumbnailUrl: mapUrl,
              sourceUrl: "https://www.bmkg.go.id/"
            }
          }
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error(e);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: '❌ Error: Gagal mengambil data dari BMKG. ' + (e.message || '') },
        { quoted: msg }
      );
    }
  }
};

// [berhasil] fitur informasi gempa ✓