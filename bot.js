require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { initSchema }        = require('./src/db/schema');
const { handleStart }       = require('./src/handlers/start');
const { handleLogCommand, handleTextInput } = require('./src/handlers/log');
const { handleCallback }    = require('./src/handlers/callbacks');
const { handleProfile } = require('./src/handlers/profile');
const { handleHistory } = require('./src/handlers/placeholders');

// ─── Startup ──────────────────────────────────────────────────────────────────

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌  TELEGRAM_BOT_TOKEN is not set. Copy .env.example → .env and add your token.');
  process.exit(1);
}

initSchema();

const bot = new TelegramBot(token, { polling: true });
console.log('🤖  BrewLog Bot is running...');

// ─── Command handlers ─────────────────────────────────────────────────────────

bot.onText(/\/start/, (msg) => handleStart(bot, msg));
bot.onText(/\/log/,   (msg) => handleLogCommand(bot, msg));
bot.onText(/\/profile/, (msg) => handleProfile(bot, msg));
bot.onText(/\/history/, (msg) => handleHistory(bot, msg));

// ─── Inline button handler ────────────────────────────────────────────────────

bot.on('callback_query', (query) => handleCallback(bot, query));

// ─── Free-text message handler ────────────────────────────────────────────────

bot.on('message', async (msg) => {
  // Ignore commands — already handled above
  if (msg.text && msg.text.startsWith('/')) return;
  // Ignore non-text messages (photos, stickers, etc.)
  if (!msg.text) return;

  await handleTextInput(bot, msg);
});

// ─── Error handling ───────────────────────────────────────────────────────────

bot.on('polling_error', (err) => {
  console.error('[polling_error]', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
