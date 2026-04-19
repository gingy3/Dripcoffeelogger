const { upsertUser } = require('../db/users');
const { createSession, getSession, setBeanName, setOptionalNote } = require('../state/sessions');
const { STEPS } = require('../state/constants');
const { primaryFlavorsKeyboard, optionalNoteKeyboard } = require('../keyboards');

/**
 * Handles the /log command.
 * Upserts the user, creates a fresh session, and asks for the bean name.
 * A new /log call mid-flow silently replaces the existing session.
 *
 * @param {TelegramBot} bot
 * @param {Message}     msg
 */
async function handleLogStart(bot, userId, chatId) {
  createSession(userId);
  await bot.sendMessage(
    chatId,
    `☕ *What coffee did you drink?*\n\nType the bean name or brand:`,
    { parse_mode: 'Markdown' },
  );
}

async function handleLogCommand(bot, msg) {
  await upsertUser(msg.from.id, msg.from.first_name);
  await handleLogStart(bot, msg.from.id, msg.chat.id);
}

/**
 * Routes incoming text messages during an active log session.
 * Only handles the two text-input steps; all button steps are handled
 * via callback_query in callbacks.js.
 *
 * Called from bot.js `on('message')` after filtering out commands.
 *
 * @param {TelegramBot} bot
 * @param {Message}     msg
 * @returns {boolean} true if the message was consumed by an active session
 */
async function handleTextInput(bot, msg) {
  const userId  = msg.from.id;
  const session = getSession(userId);

  if (!session) return false;

  const chatId = msg.chat.id;
  const text   = (msg.text || '').trim();

  // ── Bean name ─────────────────────────────────────────────────────────────
  if (session.step === STEPS.AWAITING_BEAN_NAME) {
    if (!text) {
      await bot.sendMessage(chatId, `Please type a bean name or brand to continue.`);
      return true;
    }

    setBeanName(userId, text);

    await bot.sendMessage(
      chatId,
      `👅 *What did it taste like?*\n\nPick up to 2 flavors, then tap Done:`,
      {
        parse_mode:   'Markdown',
        reply_markup: primaryFlavorsKeyboard([]),
      },
    );
    return true;
  }

  // ── Optional note (free-text path) ───────────────────────────────────────
  if (session.step === STEPS.AWAITING_OPTIONAL_NOTE) {
    if (!text) {
      await bot.sendMessage(chatId, `Type a note or tap Skip ➡️`);
      return true;
    }

    const { ratingKeyboard } = require('../keyboards');
    setOptionalNote(userId, text);

    await bot.sendMessage(
      chatId,
      `⭐ *How much did you enjoy it?*`,
      {
        parse_mode:   'Markdown',
        reply_markup: ratingKeyboard(),
      },
    );
    return true;
  }

  // Message arrived during a button-only step — gently remind the user
  const stepHints = {
    [STEPS.AWAITING_PRIMARY_FLAVORS]: `Please select your flavors using the buttons above.`,
    [STEPS.AWAITING_FRUITY_SUBNOTE]:  `Please tap Berry or Citrus above.`,
    [STEPS.AWAITING_BODY_NOTE]:       `Please tap Light, Smooth, or Rich above.`,
    [STEPS.AWAITING_RATING]:          `Please tap a rating button above.`,
  };

  const hint = stepHints[session.step];
  if (hint) await bot.sendMessage(chatId, hint);

  return true;
}

module.exports = { handleLogCommand, handleTextInput, handleLogStart };
