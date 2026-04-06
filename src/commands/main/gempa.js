const axios = require('axios');
const { formatError } = require('../../lib/response-helper');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'gempa',
  description: 'Menampilkan data gempa bumi terbaru dari BMKG',
  usage: `${commandPrefix}gempa`,
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

      const caption = `*⚠️ INFO GEMPA TERKINI ⚠️*

📅 *Tanggal:* ${gempa.Tanggal}
⌚ *Waktu:* ${gempa.Jam}
📍 *Koordinat:* ${gempa.Coordinates}
📏 *Magnitudo:* ${gempa.Magnitude} SR
🌊 *Kedalaman:* ${gempa.Kedalaman}
🗺️ *Lokasi:* ${gempa.Wilayah}
📢 *Potensi:* ${gempa.Potensi}
🕒 *Dirasakan:* ${gempa.Dirasakan || '-'}

_Sumber: BMKG Indonesia_`;

      const mapUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}`;

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          image: { url: mapUrl },
          caption: caption
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error(e);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: 'Error: Gagal mengambil data dari BMKG. ' + (e.message || '') },
        { quoted: msg }
      );
    }
  }
};

// [fix] fitur informasi gempa ✓