const axios = require('axios');
const { commandPrefix } = require('../../../config');


module.exports = {
  name: 'cuaca',
  description: 'Untuk mengetahui cuaca hari ini berdasarkan kabupaten/kota',
  async execute(sock, msg, args) {
    if (!args.length) return sock.sendMessage(msg.key.remoteJid, { text: `*Contoh:* ${commandPrefix}cuaca bandung` }, { quoted: msg });
    try {
      const response = axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${args[0]}&units=metric&appid=060a6bcfa19809c2cd4d97a212b19273`)
      const res = await response
      const name = res.data.name
      const Country = res.data.sys.country
      const Weather= res.data.weather[0].description
      const Temperature = res.data.main.temp + '°C'
      const Minimum_Temperature= res.data.main.temp_min + '°C'
      const Maximum_Temperature= res.data.main.temp_max + '°C'
      const Humidity= res.data.main.humidity + '%'
      const Wind= res.data.wind.speed + 'km/h'
      await sock.sendMessage(msg.key.remoteJid, { text: `*❏  W E A T H E R*

Place : *${name}*
Country : *${Country}*
Weather : *${Weather}*
Temperature : *${Temperature}*
Minimum Temperature : *${Minimum_Temperature}*
Maximum Temperature : *${Maximum_Temperature}*
Humidity : *${Humidity}*
Wind : *${Wind}*

` }, { quoted: msg });

      } catch(e) {
        await sock.sendMessage(
          msg.key.remoteJid,
          { text: 'Error: ' + (e.message || JSON.stringify(e) || e) },
          { quoted: msg }
        );
      }
  },
};

// [fix] fitur cuaca