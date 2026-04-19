const pool = require('./connection');

async function insertLog(userId, entry) {
  await pool.query(
    `INSERT INTO logs (user_id, bean_name, primary_flavors, sub_notes, body_note, note, rating)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      entry.bean_name,
      JSON.stringify(entry.primary_flavors),
      JSON.stringify(entry.sub_notes),
      entry.body_note,
      entry.note ?? null,
      entry.rating,
    ],
  );
}

async function getLogsByUser(userId) {
  const result = await pool.query(
    `SELECT * FROM logs WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId],
  );
  return result.rows.map(parseFlavors);
}

async function getQualifyingLogs(userId) {
  const result = await pool.query(
    `SELECT * FROM logs WHERE user_id = $1 AND rating >= 3 ORDER BY created_at ASC`,
    [userId],
  );
  const rows = result.rows.map(parseFlavors);
  return { rows, count: rows.length };
}

async function countAllLogs(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) AS count FROM logs WHERE user_id = $1`,
    [userId],
  );
  return parseInt(result.rows[0].count, 10);
}

async function getRecentLogs(userId, limit = 10) {
  const result = await pool.query(
    `SELECT * FROM logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  );
  return result.rows.map(parseFlavors);
}

function parseFlavors(row) {
  return {
    ...row,
    primary_flavors: JSON.parse(row.primary_flavors),
    sub_notes:       JSON.parse(row.sub_notes),
  };
}

module.exports = { insertLog, getLogsByUser, getQualifyingLogs, countAllLogs, getRecentLogs };
