const db = require('./connection');

/**
 * Persist a completed log entry.
 *
 * @param {number} userId
 * @param {{
 *   bean_name:       string,
 *   primary_flavors: string[],
 *   sub_notes:       string[],
 *   body_note:       string,
 *   note:            string | null,
 *   rating:          number
 * }} entry
 */
function insertLog(userId, entry) {
  db.prepare(`
    INSERT INTO logs (user_id, bean_name, primary_flavors, sub_notes, body_note, note, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    entry.bean_name,
    JSON.stringify(entry.primary_flavors),
    JSON.stringify(entry.sub_notes),
    entry.body_note,
    entry.note ?? null,
    entry.rating,
  );
}

/**
 * All logs for a user, oldest first.
 *
 * @param {number} userId
 * @returns {Array}
 */
function getLogsByUser(userId) {
  const rows = db.prepare(`
    SELECT * FROM logs WHERE user_id = ? ORDER BY created_at ASC
  `).all(userId);
  return rows.map(parseFlavors);
}

/**
 * Qualifying logs: rating >= 3, oldest first.
 * Returns both the full rows and a pre-computed count so callers
 * never need a separate COUNT query.
 *
 * @param {number} userId
 * @returns {{ rows: Array, count: number }}
 */
function getQualifyingLogs(userId) {
  const rows = db.prepare(`
    SELECT *
    FROM   logs
    WHERE  user_id = ?
      AND  rating  >= 3
    ORDER  BY created_at ASC
  `).all(userId).map(parseFlavors);

  return { rows, count: rows.length };
}

/**
 * Total log count for a user (for display purposes).
 *
 * @param {number} userId
 * @returns {number}
 */
function countAllLogs(userId) {
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM logs WHERE user_id = ?
  `).get(userId);
  return row.count;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseFlavors(row) {
  return {
    ...row,
    primary_flavors: JSON.parse(row.primary_flavors),
    sub_notes:       JSON.parse(row.sub_notes),
  };
}

module.exports = { insertLog, getLogsByUser, getQualifyingLogs, countAllLogs, getRecentLogs };

/**
 * Most recent logs for a user, newest first.
 *
 * @param {number} userId
 * @param {number} limit  default 10
 * @returns {Array}
 */
function getRecentLogs(userId, limit = 10) {
  const rows = db.prepare(`
    SELECT *
    FROM   logs
    WHERE  user_id = ?
    ORDER  BY created_at DESC
    LIMIT  ?
  `).all(userId, limit).map(parseFlavors);

  return rows;
}
