const { upsertUser } = require('../db/users');

/**
 * Handles the /start command.
 * Upserts the user and sends an onboarding message.
 *
 * @param {TelegramBot} bot
 * @param {Message}     msg
 */
async function handleStart(bot, msg) {
  const userId    = msg.from.id;
  const firstName = msg.from.first_name;

  await upsertUser(userId, firstName);

  const name = (firstName && firstName.trim()) || 'there';

  await bot.sendMessage(
    msg.chat.id,
    `☕ *Hey ${name}, welcome to BrewLog!*\n\n` +
    `I help you figure out what kind of coffee you actually like.\n\n` +
    `Log what you drink, and after *5 entries* I'll build your personal taste profile — ` +
    `a plain-English description you can use next time you're buying beans.\n\n` +
    `*Commands:*\n` +
    `/log — Log a coffee\n` +
    `/profile — View your taste profile\n` +
    `/history — See your last 5 logs`,
    { parse_mode: 'Markdown' },
  );
}

module.exports = { handleStart };
