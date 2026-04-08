const performanceMonitor = require('../../lib/performance-monitor');

module.exports = {
  name: 'ping-full',
  description: 'Full bot performance check',
  async execute(sock, msg) {
    try {
      const report = performanceMonitor.getReport();
      
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

      await sock.sendMessage(msg.key.remoteJid, { text: fullText }, { quoted: msg });

    } catch (error) {
      console.error('Performance command error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error!' }, { quoted: msg });
    }
  },
};

// [fix] ping to check full bot performance ✓
