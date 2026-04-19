const { getQualifyingLogs, countAllLogs } = require('../db/logs');
const { getUserById }                     = require('../db/users');
const { generateProfile }                 = require('../profiling');
const { PROFILE_THRESHOLD }               = require('../state/constants');
const { msgBuyingTip }                    = require('../milestone');

// ─── Message builders ─────────────────────────────────────────────────────────

function msgNotReady(count, remaining, totalCount) {
  return (
    `☕ *Taste Profile*\n\n` +
    `Not enough data yet.\n\n` +
    `*${count}/${PROFILE_THRESHOLD}* qualifying logs (rating ≥ 3)\n` +
    `${totalCount} total logs\n\n` +
    `_${remaining} more rated log${remaining === 1 ? '' : 's'} to go._`
  );
}

function msgProfile(firstName, profile) {
  const flavorList = profile.topFlavors.map((f) => `• ${f}`).join('\n');

  return (
    `☕ *${firstName}'s Taste Profile*\n\n` +
    `*Type:* ${profile.tasteType}\n\n` +
    `*You tend to enjoy:*\n${flavorList}\n\n` +
    `*Mouthfeel:* ${profile.dominantBody}`
  );
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * /profile command handler.
 *
 * - Below threshold: show progress message.
 * - At or above threshold: generate and display profile.
 *   Generates fresh every time so the profile reflects the latest logs.
 *
 * @param {TelegramBot} bot
 * @param {Message}     msg
 */
async function handleProfile(bot, msg) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  const { rows, count } = await getQualifyingLogs(userId);

  if (count < PROFILE_THRESHOLD) {
    const remaining  = PROFILE_THRESHOLD - count;
    const totalCount = await countAllLogs(userId);
    return bot.sendMessage(chatId, msgNotReady(count, remaining, totalCount), {
      parse_mode: 'Markdown',
    });
  }

  const user      = await getUserById(userId);
  const firstName = (user?.first_name?.trim()) || 'You';
  const profile   = generateProfile(rows);

  await bot.sendMessage(chatId, msgProfile(firstName, profile), {
    parse_mode: 'Markdown',
  });

  await bot.sendMessage(chatId, msgBuyingTip(profile.keywordChain), {
    parse_mode: 'Markdown',
  });
}

module.exports = { handleProfile, msgNotReady, msgProfile };
