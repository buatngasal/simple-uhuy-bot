const axios = require('axios');
const fs = require('fs');
const config = require('../../config'); 

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


      const targets = config.groupList.filter(jid => jid.endsWith('@g.us'));

        for (const targetJid of targets) {
          try {
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
            // Pause for 1-2 seconds between groups to avoid being marked as spam by the WA server
            await new Promise(resolve => setTimeout(resolve, 2000)); 
          } catch (err) {
            console.error(`Gagal mengirim pesan ke grup ${targetJid}:`, err);
          }
        }
      
    }
  } catch (err) {
    // Let pollBackground handle errors for cleaner logs
    throw err; 
  }
}

module.exports = { checkGempa };
