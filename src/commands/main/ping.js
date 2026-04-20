const performanceMonitor = require('../../lib/performance-monitor');

module.exports = {
  name: 'ping',
  description: 'Cek kecepatan respon dan performa bot',
  async execute(sock, msg, args) {
    try {
      const report = performanceMonitor.getReport();
      
      // Jika user mengetik .ping all / .ping full
      if (args[0] === 'all' || args[0] === 'full') {
        const fullText = `🔧 *Detailed Performance Report*

*System Info:*
• Platform: ${report.system.platform} ${report.system.arch}
• Node.js: ${report.system.nodeVersion}
• CPU Cores: ${report.system.cpuCount}
• Total RAM: ${report.system.totalMemory}
• Free RAM: ${report.system.freeMemory}

*Bot Metrics:*
• Uptime: ${report.bot.uptime}
• Messages: ${report.bot.messagesProcessed}
• Commands: ${report.bot.commandsExecuted}
• Errors: ${report.bot.errorsOccurred}
• Avg Response: ${report.bot.avgResponseTime}
• Messages/Hour: ${report.bot.messagesPerHour}
• Commands/Hour: ${report.bot.commandsPerHour}

*Memory Usage:*
• RSS: ${report.memory.rss}
• Heap Used: ${report.memory.heapUsed}
• Heap Total: ${report.memory.heapTotal}

*Cache Performance:*
• Hit Rate: ${report.cache.hitRate}
• Cache Size: ${report.cache.cacheSize}
• API Cache Size: ${report.cache.apiCacheSize}

*API Performance:*
• Total Requests: ${report.api.totalRequests}
• Cached Responses: ${report.api.cachedResponses}
• Cache Hit Rate: ${report.api.cacheHitRate}
• Failed Requests: ${report.api.failedRequests}`;

        return await sock.sendMessage(msg.key.remoteJid, { text: fullText }, { quoted: msg });
      }

      // Default: Jika hanya mengetik .ping
      const simpleText = `Response Time : *${report.bot.avgResponseTime}*`;
      await sock.sendMessage(msg.key.remoteJid, { text: simpleText }, { quoted: msg });

    } catch (e) {
      console.error('Ping command error:', e);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error saat menjalankan perintah.' }, { quoted: msg });
    }
  }
};

// [fix] cek kecepatan respon dan performa bot ✓
