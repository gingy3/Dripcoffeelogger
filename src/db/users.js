const pool = require('./connection');

async function upsertUser(userId, firstName) {
  const name = (firstName && firstName.trim()) || 'friend';
  await pool.query(
    `INSERT INTO users (user_id, first_name) VALUES ($1, $2)
     ON CONFLICT(user_id) DO UPDATE SET first_name = EXCLUDED.first_name`,
    [userId, name],
  );
}

async function getUserById(userId) {
  const result = await pool.query(
    `SELECT user_id, first_name, created_at, profile_unlocked FROM users WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0];
}

async function tryUnlockProfile(userId) {
  const result = await pool.query(
    `UPDATE users SET profile_unlocked = 1 WHERE user_id = $1 AND profile_unlocked = 0`,
    [userId],
  );
  return result.rowCount === 1;
}

async function markProfileUnlocked(userId) {
  await pool.query(
    `UPDATE users SET profile_unlocked = 1 WHERE user_id = $1`,
    [userId],
  );
}

module.exports = { upsertUser, getUserById, tryUnlockProfile, markProfileUnlocked };
