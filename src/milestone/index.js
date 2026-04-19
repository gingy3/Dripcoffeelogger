const { getQualifyingLogs }             = require('../db/logs');
const { getUserById, tryUnlockProfile } = require('../db/users');
const { generateProfile }               = require('../profiling');
const { PROFILE_THRESHOLD }             = require('../state/constants');

// ─── Message templates ────────────────────────────────────────────────────────

/**
 * Standard post-log confirmation shown on every save.
 * count    — total qualifying log count after this save
 * remaining — logs still needed before profile unlocks
 */
function msgConfirmation(count, remaining) {
  if (remaining > 0) {
    return (
      `✅ *Logged!*\n\n` +
      `${count}/${PROFILE_THRESHOLD} qualifying logs.\n` +
      `_${remaining} more to unlock your taste profile._`
    );
  }
  // count >= threshold but profile already unlocked (subsequent logs)
  return `✅ *Logged!* Your profile keeps getting sharper. Use /profile to view it.`;
}

/**
 * One-time milestone message sent when profile_unlocked flips to true.
 * firstName — from users table, never blank (falls back to 'friend')
 * profile   — return value of generateProfile()
 */
function msgMilestone(firstName, profile) {
  const flavorList = profile.topFlavors.map((f) => `• ${f}`).join('\n');

  return (
    `🎉 *${firstName}, you've unlocked your taste profile!*\n\n` +
    `Based on your first ${PROFILE_THRESHOLD} liked coffees, here's what your palate says:\n\n` +

    `*Taste type:* ${profile.tasteType}\n\n` +

    `*You tend to enjoy:*\n` +
    `${flavorList}\n\n` +

    `━━━━━━━━━━━━━━━━━\n` +
    `Use /profile any time to see this again.\n` +
    `Keep logging to sharpen it further.`
  );
}

function msgBuyingTip(keywordChain) {
  return `*Use this when buying beans:*\n_"${keywordChain}"_`;
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Called after every log is saved. Returns the message string the bot should
 * send — never sends anything itself.
 *
 * Logic:
 *   - Always returns a confirmation string.
 *   - If qualifying count just hit PROFILE_THRESHOLD for the first time,
 *     also generates the profile, sets profile_unlocked = true, and returns
 *     the milestone message instead of the normal confirmation.
 *
 * @param {number} userId
 * @returns {{
 *   message:   string,      the text to send
 *   milestone: boolean,     true if this is the unlock event
 *   buyingTip: string|null  buying-tip message, only set on milestone unlock
 * }}
 */
function checkMilestone(userId) {
  const { rows, count } = getQualifyingLogs(userId);

  // Not yet at threshold — return a plain progress confirmation
  if (count < PROFILE_THRESHOLD) {
    const remaining = PROFILE_THRESHOLD - count;
    return { message: msgConfirmation(count, remaining), milestone: false, buyingTip: null };
  }

  // At or past threshold — attempt the atomic unlock
  const justUnlocked = tryUnlockProfile(userId);

  if (!justUnlocked) {
    // Profile already unlocked on a previous log — just confirm
    return { message: msgConfirmation(count, 0), milestone: false, buyingTip: null };
  }

  // First time crossing the threshold — generate and return the milestone message
  const user      = getUserById(userId);
  const firstName = (user?.first_name?.trim()) || 'friend';
  const profile   = generateProfile(rows);

  return { message: msgMilestone(firstName, profile), milestone: true, buyingTip: msgBuyingTip(profile.keywordChain) };
}

module.exports = { checkMilestone, msgConfirmation, msgMilestone, msgBuyingTip };
