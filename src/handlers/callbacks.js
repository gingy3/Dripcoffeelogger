const {
  getSession,
  clearSession,
  togglePrimaryFlavor,
  confirmPrimaryFlavors,
  setFruitySubnote,
  setBodyNote,
  setOptionalNote,
  setRating,
  SessionError,
} = require('../state/sessions');

const { STEPS } = require('../state/constants');

const {
  primaryFlavorsKeyboard,
  fruitySubnoteKeyboard,
  bodyNoteKeyboard,
  optionalNoteKeyboard,
  ratingKeyboard,
  logAnotherKeyboard,
} = require('../keyboards');

const { insertLog }        = require('../db/logs');
const { checkMilestone }   = require('../milestone');
const { handleLogStart }   = require('./log');

/**
 * Central handler for all callback_query events.
 * Routes by callback_data prefix to the appropriate step handler.
 *
 * Prefixes:
 *   pf:   primary flavor toggle / done
 *   sn:   fruity sub-note selection
 *   bn:   body note selection
 *   on:   optional note skip
 *   rt:   rating selection
 */
async function handleCallback(bot, query) {
  const userId    = query.from.id;
  const chatId    = query.message.chat.id;
  const messageId = query.message.message_id;
  const data      = query.data;

  await bot.answerCallbackQuery(query.id);

  // "Log another?" — valid even without an active session
  if (data === 'la:yes') {
    await handleLogAnother(bot, userId, chatId, messageId);
    return;
  }

  const session = getSession(userId);

  if (!session) {
    return;
  }

  try {
    if (data.startsWith('pf:')) {
      await handlePrimaryFlavor(bot, userId, chatId, messageId, data.slice(3));
    } else if (data.startsWith('sn:')) {
      await handleSubnote(bot, userId, chatId, data.slice(3));
    } else if (data.startsWith('bn:')) {
      await handleBodyNote(bot, userId, chatId, data.slice(3));
    } else if (data === 'on:skip') {
      await handleOptionalNoteSkip(bot, userId, chatId);
    } else if (data.startsWith('rt:')) {
      await handleRating(bot, userId, chatId, messageId, parseInt(data.slice(3), 10));
    }
  } catch (err) {
    if (err instanceof SessionError) {
      console.warn('[callback] SessionError (stale button?):', err.message);
    } else {
      console.error('[callback] Unexpected error:', err);
      await bot.sendMessage(chatId, `Something went wrong. Please try /log again.`);
      clearSession(userId);
    }
  }
}

// ─── Step handlers ────────────────────────────────────────────────────────────

async function handlePrimaryFlavor(bot, userId, chatId, messageId, value) {
  if (value === 'done') {
    const updated = confirmPrimaryFlavors(userId);

    if (updated.step === STEPS.AWAITING_FRUITY_SUBNOTE) {
      await bot.sendMessage(chatId, `🍓 *Fruity how?*\n\nPick the one that fits best:`, {
        parse_mode:   'Markdown',
        reply_markup: fruitySubnoteKeyboard(),
      });
    } else {
      await sendBodyNotePrompt(bot, chatId);
    }
    return;
  }

  const { action, session: updated } = togglePrimaryFlavor(userId, value);

  if (action === 'capped') {
    await bot.sendMessage(chatId, `You can pick at most 2 flavors. Deselect one first.`);
    return;
  }

  await bot.editMessageReplyMarkup(
    primaryFlavorsKeyboard(updated.data.primary_flavors),
    { chat_id: chatId, message_id: messageId },
  ).catch(() => {});  // swallow "message not modified" on double-tap
}

async function handleSubnote(bot, userId, chatId, value) {
  setFruitySubnote(userId, value);
  await sendBodyNotePrompt(bot, chatId);
}

async function handleBodyNote(bot, userId, chatId, value) {
  setBodyNote(userId, value);
  await bot.sendMessage(chatId, `📝 *Any tasting notes?* (optional)\n\nType something or tap Skip:`, {
    parse_mode:   'Markdown',
    reply_markup: optionalNoteKeyboard(),
  });
}

async function handleOptionalNoteSkip(bot, userId, chatId) {
  setOptionalNote(userId, null);
  await bot.sendMessage(chatId, `⭐ *How much did you enjoy it?*`, {
    parse_mode:   'Markdown',
    reply_markup: ratingKeyboard(),
  });
}

/**
 * Final step. Saves the log, then delegates entirely to checkMilestone()
 * for the confirmation message. No confirmation logic lives here.
 */
async function handleRating(bot, userId, chatId, messageId, rating) {
  const session = setRating(userId, rating);

  insertLog(userId, session.data);
  clearSession(userId);

  await bot.editMessageReplyMarkup(
    { inline_keyboard: [] },
    { chat_id: chatId, message_id: messageId },
  ).catch(() => {});

  const { message, buyingTip } = checkMilestone(userId);

  await bot.sendMessage(chatId, message, {
    parse_mode:   'Markdown',
    reply_markup: logAnotherKeyboard(),
  });

  if (buyingTip) {
    await bot.sendMessage(chatId, buyingTip, { parse_mode: 'Markdown' });
  }
}

async function handleLogAnother(bot, userId, chatId, messageId) {
  await bot.editMessageReplyMarkup(
    { inline_keyboard: [] },
    { chat_id: chatId, message_id: messageId },
  ).catch(() => {});
  await handleLogStart(bot, userId, chatId);
}

// ─── Shared prompt helpers ────────────────────────────────────────────────────

async function sendBodyNotePrompt(bot, chatId) {
  await bot.sendMessage(chatId, `💧 *How did it feel in the mouth?*`, {
    parse_mode:   'Markdown',
    reply_markup: bodyNoteKeyboard(),
  });
}

module.exports = { handleCallback };
