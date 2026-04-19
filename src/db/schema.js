const pool = require('./connection');

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id          BIGINT      PRIMARY KEY,
      first_name       TEXT        NOT NULL DEFAULT 'friend',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      profile_unlocked INTEGER     NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS logs (
      id              SERIAL      PRIMARY KEY,
      user_id         BIGINT      NOT NULL,
      bean_name       TEXT        NOT NULL,
      primary_flavors TEXT        NOT NULL,
      sub_notes       TEXT        NOT NULL,
      body_note       TEXT        NOT NULL,
      note            TEXT,
      rating          INTEGER     NOT NULL CHECK(rating BETWEEN 1 AND 5),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
  `);
}

module.exports = { initSchema };
