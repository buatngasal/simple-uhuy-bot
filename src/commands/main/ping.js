const performanceMonitor = require('../../lib/performance-monitor');

module.exports = {
  name: 'ping',
  description: 'Check bot response time',
  async execute(sock, msg) {
    try {
      const report = performanceMonitor.getReport();
      const text = `Response Time : *${report.bot.avgResponseTime}*`;
      
      await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error' });
    }
  }
};

// [fix] ping to check response time ✓

