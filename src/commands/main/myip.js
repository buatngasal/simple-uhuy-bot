const axios = require('axios');
const { formatError } = require('../../lib/response-helper');
const { commandPrefix } = require('../../../config');

module.exports = {
  name: 'myip',
  description: 'Menampilkan informasi detail alamat IP',
  usage: `${commandPrefix}myip`,
  async execute(sock, msg, args) {

    const url = 'http://ip-api.com/json'; 
    
    try {
      
      const response = await axios.get(url);
      const data = response.data;

      if (data.status !== 'success') {
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: formatError('Gagal', 'Data IP tidak ditemukan.') 
        }, { quoted: msg });
      }

      const caption = `*🌐 INFORMASI ALAMAT IP 🌐*

📍 *IP Address:* ${data.query}
🏢 *ISP:* ${data.isp}
🌍 *Negara:* ${data.country} (${data.countryCode})
🏙️ *Kota:* ${data.city}
📮 *Kode Pos:* ${data.zip}
🧭 *Koordinat:* ${data.lat}, ${data.lon}
⏰ *Timezone:* ${data.timezone}
📡 *Organisasi:* ${data.org}

_Sumber: IP-API Data Service_`;

      await sock.sendMessage(
        msg.key.remoteJid,
        { text: caption },
        { quoted: msg }
      );

    } catch (e) {
      console.error(e);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: 'Error: Gagal mengambil data IP. ' + (e.message || '') },
        { quoted: msg }
      );
    }
  }
};

// [fix] fitur my ip ✓