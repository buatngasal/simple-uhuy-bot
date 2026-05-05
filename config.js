module.exports = {
  botName: 'Uhuy-Bot',
  ownerName: 'Uhuy',
  ownerNumber: [ // Owner phone numbers
    '6285935342970', // index 0
    '6283135935659', // index 1
    '6285857840057', // index 2
  ],
  devNumber: [ // Dev IDs: use /1+1 command, check console output, and map to ownerNumber order
    '122922568048708', // index 0
    '123901938000102', // index 1
    '106163622387764', // index 2
  ], 
  commandPrefix: '.',
  sessionName: 'session',

  // Database file paths
  databaseFiles: {
    schedules: 'schedules.json',
    points: 'points.json',
    menfess: 'menfess.json',
    afk: 'afk.json',
    welcome: 'welcome.json',
    storage: 'storage.json',
  },

  // Background polling intervals (in milliseconds)
  polling: {
    scheduledMessages: 60 * 1000, // 1 minute
    gempaMessages: 60 * 1000, // 1 minute
  },

  // API settings
  api: {
    imageDownload: {
      timeout: 30000 // 30 seconds
    }
  },

  // Input validation limits
  validation: {
    maxMessageLength: 1000,
    maxTriggerLength: 100,
    maxResponseLength: 1000,
    maxSymbolLength: 10,
    minPrice: 0.01
  },

  // File processing
  fileProcessing: {
    maxFileSize: 100 * 1024 * 1024, // 100MB (WhatsApp limit)
    supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    supportedVideoFormats: ['mp4', 'avi', 'mov', 'mkv']
  }
}; 