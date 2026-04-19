const db = require('./connection');

/**
 * Insert user if not present, update first_name if they return.
 * Called on every /start and /log to ensure the row exists.
 *
 * @param {number} userId
 * @param {string} firstName  - from msg.from.first_name; falls back to 'friend'
 */
function upsertUser(userId, firstName) {
  const name = (firstName && firstName.trim()) || 'friend';
  db.prepare(`
    INSERT INTO users (user_id, first_name)
    VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET first_name = excluded.first_name
  `).run(userId, name);
}

/**
 * @param {number} userId
 * @returns {{ user_id, first_name, created_at, profile_unlocked } | undefined}
 */
function getUserById(userId) {
  return db.prepare(`
    SELECT user_id, first_name, created_at, profile_unlocked
    FROM users
    WHERE user_id = ?
  `).get(userId);
}

/**
 * Atomically mark profile as unlocked.
 * Uses a WHERE guard so concurrent calls are safe even in WAL mode.
 *
 * @param {number} userId
 * @returns {boolean} true if this call was the one that flipped the flag
 */
function tryUnlockProfile(userId) {
  const result = db.prepare(`
    UPDATE users
    SET profile_unlocked = 1
    WHERE user_id = ? AND profile_unlocked = 0
  `).run(userId);
  return result.changes === 1;
}

module.exports = { upsertUser, getUserById, tryUnlockProfile, markProfileUnlocked };

/**
 * @dev-only
 * Unconditionally set profile_unlocked = true for a user.
 * Used by the seed script after inserting 10 qualifying logs so the bot
 * does not fire a false milestone message on the next logged coffee.
 * Do not call from production paths — use tryUnlockProfile() there.
 *
 * @param {number} userId
 */
function markProfileUnlocked(userId) {
  db.prepare(`
    UPDATE users SET profile_unlocked = 1 WHERE user_id = ?
  `).run(userId);
}
