require('dotenv').config();
const DatabaseService = require('./services/databaseService');
const BotService = require('./services/botService');

// Global error handling
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

// Initialize and start services
(async () => {
  try {
    await DatabaseService.connect();
    console.log('[Database] Connected successfully');

    BotService.start();
  } catch (err) {
    console.error('[Startup Error] Failed to initialize application:', err);
    process.exit(1);
  }
})();
