const { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const config = require('./config');
const { addPoint } = require('./src/commands/main/points');
const database = require('./src/lib/database');
const apiManager = require('./src/lib/api-manager');
const cache = require('./src/lib/cache');
const performanceMonitor = require('./src/lib/performance-monitor');
const connectionHealth = require('./src/lib/connection-health');
const menfessCmd = require('./src/commands/main/menfess');
const autoEmoji = require('./src/lib/auto-emoji');
const { afkHandler } = require('./src/lib/afk-handler');
const { handleGroupUpdate } = require('./src/lib/group-update');
const { autoLoginWifi } = require('./src/lib/wifi-connect');
const { getMediaDebugInfo, logDebugStatus } = require('./src/lib/debug'); let globalDebugMode = false; 
const storageLib = require('./src/lib/storage');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

// Initialize optimized command loader
const CommandLoader = require('./src/lib/command-loader');
const commandsDir = path.join(__dirname, 'src/commands/main');
const commandLoader = new CommandLoader(commandsDir);

// Legacy functions replaced by database layer
async function loadJson(p) {
  const filename = path.basename(p, '.json');
  return await database.load(filename, {});
}

function saveJson(p, d) {
  const filename = path.basename(p, '.json');
  database.save(filename, d);
}

// Store interval IDs for proper cleanup
const backgroundIntervals = [];

async function pollBackground(sock) {

  // Scheduled Messages - Optimized
  const scheduleInterval = setInterval(async () => {
    try {
      const db = await database.load('schedules');
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);

      const messagesToSend = [];
      for (const jid in db) {
        const schedules = db[jid] || [];
        for (const s of schedules) {
          if (s.time === hhmm) {
            messagesToSend.push({ jid, message: s.message });
          }
        }
      }

      // Send messages concurrently
      if (messagesToSend.length > 0) {
        await Promise.allSettled(
          messagesToSend.map(({ jid, message }) =>
            sock.sendMessage(jid, { text: `[Scheduled] ${message}` })
              .catch(error => console.error(`Error sending scheduled message to ${jid}:`, error.message))
          )
        );
      }
    } catch (error) {
      console.error('Error in scheduled messages polling:', error.message);
    }
  }, config.polling.scheduledMessages);

  backgroundIntervals.push(scheduleInterval);

}

// Function to clear all background intervals
function clearBackgroundIntervals() {
  backgroundIntervals.forEach(interval => {
    clearInterval(interval);
  });
  backgroundIntervals.length = 0;
}

// SET: WiFi SSID and Password
const SSID_TARGET = "MURYA";
const PASS_PORTAL = "bud4m4n1s";

async function startBot() {
  try {
    console.log(chalk.blue('🚀 [System] Verifying initial connection...'));
    await autoLoginWifi(SSID_TARGET, PASS_PORTAL);
  } catch (e) {
    console.log(chalk.red('⚠️ Network initialization failed, attempting to continue...'));
  }

  const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    browser: ['Uhuy-Bot', 'Chrome', '110.0.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.message || 'unknown';
      connectionHealth.connectionClosed(reason);
      
      // Clear intervals before reconnecting
      clearBackgroundIntervals();
      connectionHealth.stopMonitoring();

      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(chalk.red('Connection closed. Reconnecting...'));
      
      if (reason.includes('ECONNREFUSED') || reason.includes('ENOTFOUND') || reason.includes('timed out')) {
        console.log(chalk.yellow('📡 Connection lost. Running WiFi auto-switch...'));
        try {
          await autoLoginWifi(SSID_TARGET, PASS_PORTAL);
        } catch (err) {
          console.log(chalk.red(`⚠️ ${err.message}`));
        }
      }

      if (shouldReconnect && connectionHealth.shouldReconnect()) {
        const delay = connectionHealth.getReconnectDelay();
        console.log(chalk.yellow(`Reconnecting in ${delay}ms...`));
        setTimeout(() => startBot(), delay);
      } else if (!shouldReconnect) {
        console.log(chalk.red('Logged out. Not reconnecting.'));
      } else {
        console.log(chalk.red('Max reconnect attempts reached.'));
      }
    } else if (connection === 'open') {
      connectionHealth.connectionOpened();
      console.log(chalk.green('Uhuy-Bot is ready!'));

      // Initialize command loader
      await commandLoader.initialize();
      console.log(chalk.blue('Command loader initialized'));

      // Preload frequently used commands
      const frequentCommands = ['help', 'menu', 'ping', 'points'];
      await commandLoader.preloadCommands(frequentCommands);

      // Preload frequently accessed data
      await database.preload();
      console.log(chalk.blue('Database preloaded successfully'));

      // Start performance monitoring
      performanceMonitor.start();
      console.log(chalk.blue('Performance monitoring started'));

      // Start connection health monitoring
      connectionHealth.startMonitoring(sock);
      console.log(chalk.blue('Connection health monitoring started'));
    }
  });
  
  // Welcome
  sock.ev.on('group-participants.update', async (update) => {
    await handleGroupUpdate(sock, update);
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const startTime = Date.now();

    try {
      // Record message processing
      performanceMonitor.recordMessage();

      // Passive point for any message
      await addPoint(msg.key.remoteJid, msg.key.participant || msg.key.remoteJid, 1);

      // Parsing Body, Args, Command
      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const isCommand = body.startsWith(config.commandPrefix);
      const args = isCommand ? body.slice(config.commandPrefix.length).trim().split(/ +/) : [];
      const command = args.length > 0 ? args.shift().toLowerCase() : '';

      // Debug mode
      if (isCommand && command === 'debug') {
        const sender = msg.key.participant || msg.key.remoteJid;
        const isAuthorized = logDebugStatus(sender, config);
        if (!isAuthorized) {
          return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Access Denied: Owner/Dev Only.' }, { quoted: msg });
        }
        const action = args[0]?.toLowerCase();
        if (action === 'on') {
          globalDebugMode = true;
          return await sock.sendMessage(msg.key.remoteJid, { text: '✅ *Debug Mode:* ON' }, { quoted: msg });
        } else if (action === 'off') {
          globalDebugMode = false;
          return await sock.sendMessage(msg.key.remoteJid, { text: '❌ *Debug Mode:* OFF' }, { quoted: msg });
        } else {
          return await sock.sendMessage(msg.key.remoteJid, { text: `*Usage* : ${config.commandPrefix}debug on/off` }, { quoted: msg });
        }
      }
      if (globalDebugMode) {
        const debugText = getMediaDebugInfo(msg);
        if (debugText) {
          await sock.sendMessage(msg.key.remoteJid, { text: debugText }, { quoted: msg });
        }
      }

      // Eval Logic
      if (body.startsWith('/')) {
        const { runEval } = require('./src/lib/eval');
        const code = body.slice(1).trim();
        if (code) {
          await runEval(sock, msg, code, config, args);
          return;
        }
      }

      // Shell Terminal Logic
      if (body.startsWith('$ ')) {
        const { runShell } = require('./src/lib/shell-exec'); // Choose the library shell type (exec/spawn)
        const commandText = body.slice(2).trim();
        if (commandText) {
          await runShell(sock, msg, commandText, config);
          return;
        }
      }

      // Menfess
      const isReply = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!isCommand || isReply) {
        const isMenfessReply = await menfessCmd.handleReply(sock, msg, body);
        if (isMenfessReply) return;
      }
      
      // Auto emoji
      const isEmojiAuto = await autoEmoji.handle(sock, msg);
      if (isEmojiAuto) return;

      // Afk handler
      const isAfk = await afkHandler(sock, msg);
      if (isAfk) return;

      // Storage trigger
      if (!isCommand) {
        const isStorageTrigger = await storageLib.handle(sock, msg, body);
        if (isStorageTrigger) return;
      }

      if (!isCommand) return;

      if (commandLoader.hasCommand(command)) {
        console.log('COMMAND TRIGGERED:', command, args);
        const commandStartTime = Date.now();
        try {
          const cmd = await commandLoader.getCommand(command);
          if (cmd) {
            await cmd.execute(sock, msg, args);
            performanceMonitor.recordCommand(command, commandStartTime);
          } else {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to load command.' }, { quoted: msg });
          }
        } catch (e) {
          console.error(`Error executing command ${command}:`, e);
          performanceMonitor.recordError(e, `command:${command}`);
          await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: ' + e.message }, { quoted: msg });
        }
      }
    } catch (error) {
      console.error('Error processing message:', error.message);
      performanceMonitor.recordError(error, 'message_processing');
    }
  });

  await pollBackground(sock);
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\nShutting down bot...'));
  clearBackgroundIntervals();

  // Shutdown command loader
  commandLoader.shutdown();
  console.log(chalk.blue('Command loader shutdown'));

  // Stop performance monitoring
  performanceMonitor.stop();
  console.log(chalk.blue('Performance monitoring stopped'));

  // Flush any pending database writes
  await database.flush();
  console.log(chalk.blue('Database flushed'));

  // Shutdown API manager
  apiManager.shutdown();

  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\nShutting down bot...'));
  clearBackgroundIntervals();

  // Shutdown command loader
  commandLoader.shutdown();
  console.log(chalk.blue('Command loader shutdown'));

  // Stop performance monitoring
  performanceMonitor.stop();
  console.log(chalk.blue('Performance monitoring stopped'));

  // Flush any pending database writes
  await database.flush();
  console.log(chalk.blue('Database flushed'));

  // Shutdown API manager
  apiManager.shutdown();

  process.exit(0);
});

startBot();