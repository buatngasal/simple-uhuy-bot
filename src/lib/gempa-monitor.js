const axios = require('axios');
const fs = require('fs');

async function checkGempa(sock) {
  try {
    const response = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
    const gempa = response.data.Infogempa.gempa;
    const lastGempaFile = '../../last_gempa.json';

    // Fetch existing data if available
    let lastData = fs.existsSync(lastGempaFile) ? JSON.parse(fs.readFileSync(lastGempaFile)) : {};

    // Check for changes based on timestamp
    if (gempa.DateTime !== lastData.DateTime) {
      
      // Save latest data
      fs.writeFileSync(lastGempaFile, JSON.stringify(gempa));

      const caption = `⚠️ *- GEMPA ◦ TERDETEKSI -*

  ◦ *Lintang* : ${gempa.Lintang}
  ◦ *Bujur* : ${gempa.Bujur}
  ◦ *Skala* : ${gempa.Magnitude} SR
  ◦ *Kedalaman* : ${gempa.Kedalaman}
  ◦ *Waktu* : ${gempa.Tanggal}, ${gempa.Jam}
  ◦ *Pusat Gempa* : ${gempa.Wilayah}
  ◦ *Zona Gempa* : ${gempa.Dirasakan || '-'}
  ◦ *Arahan* : ${gempa.Potensi}

  ◦ *Sumber* : BMKG Indonesia`;

      // Send to log group or specific admin number
      const targetJid = '120363047892543638@g.us'; // Replace with target JID
      await sock.sendMessage(targetJid, { 
        text: caption,
        contextInfo: {
          externalAdReply: {
            title: `${gempa.Wilayah}`,
            body: `Magnitudo: ${gempa.Magnitude} SR | Kedalaman: ${gempa.Kedalaman}`,
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: true,
            thumbnailUrl: `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}`,
            sourceUrl: "https://www.bmkg.go.id/"
          }
        }
      });
      
    }
  } catch (err) {
    // Let pollBackground handle errors for cleaner logs
    throw err; 
  }
}

module.exports = { checkGempa };
