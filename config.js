module.exports = {
  botName: 'Uhuy-Bot',
  ownerName: 'Uhuy',
  ownerNumber: '6285935342970', // Change to your number
  commandPrefix: '.',
  sessionName: 'session',

  // Database file paths
  databaseFiles: {
    schedules: 'schedules.json',
    birthdays: 'birthdays.json',
    points: 'points.json',
    autoresponder: 'autoresponder.json',
    menfess: 'menfess.json',
  },

  // Background polling intervals (in milliseconds)
  polling: {
    scheduledMessages: 60 * 1000, // 1 minute
    birthdayReminders: 60 * 1000 // 1 minute
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