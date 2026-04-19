const { getQualifyingLogs }             = require('../db/logs');
const { getUserById, tryUnlockProfile } = require('../db/users');
const { generateProfile }               = require('../profiling');
const { PROFILE_THRESHOLD }             = require('../state/constants');

// ─── Message templates ────────────────────────────────────────────────────────

function msgConfirmation(count, remaining) {
  if (remaining > 0) {
    return (
      `✅ *Logged!*\n\n` +
      `${count}/${PROFILE_THRESHOLD} qualifying logs.\n` +
      `_${remaining} more to unlock your taste profile._`
    );
  }
  return `✅ *Logged!* Your profile keeps getting sharper. Use /profile to view it.`;
}

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

async function checkMilestone(userId) {
  const { rows, count } = await getQualifyingLogs(userId);

  if (count < PROFILE_THRESHOLD) {
    const remaining = PROFILE_THRESHOLD - count;
    return { message: msgConfirmation(count, remaining), milestone: false, buyingTip: null };
  }

  const justUnlocked = await tryUnlockProfile(userId);

  if (!justUnlocked) {
    return { message: msgConfirmation(count, 0), milestone: false, buyingTip: null };
  }

  const user      = await getUserById(userId);
  const firstName = (user?.first_name?.trim()) || 'friend';
  const profile   = generateProfile(rows);

  return { message: msgMilestone(firstName, profile), milestone: true, buyingTip: msgBuyingTip(profile.keywordChain) };
}

module.exports = { checkMilestone, msgConfirmation, msgMilestone, msgBuyingTip };
