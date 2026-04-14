const db = require('./connection');

/**
 * Creates tables if they do not exist.
 * Safe to call on every startup — uses IF NOT EXISTS throughout.
 *
 * Migration strategy (MVP): if a breaking schema change is needed,
 * increment SCHEMA_VERSION and add an ALTER TABLE block below.
 */
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id         INTEGER PRIMARY KEY,
      first_name      TEXT    NOT NULL DEFAULT 'friend',
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      profile_unlocked INTEGER NOT NULL DEFAULT 0  -- 0 = false, 1 = true
    );

    CREATE TABLE IF NOT EXISTS logs (
      id              INTEGER  PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER  NOT NULL,
      bean_name       TEXT     NOT NULL,
      primary_flavors TEXT     NOT NULL,  -- JSON array, e.g. ["Fruity","Roasted"]
      sub_notes       TEXT     NOT NULL,  -- JSON array, e.g. ["Berry"] or []
      body_note       TEXT     NOT NULL,  -- "Light" | "Smooth" | "Rich"
      note            TEXT,               -- nullable free text
      rating          INTEGER  NOT NULL CHECK(rating BETWEEN 1 AND 5),
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
  `);
}

module.exports = { initSchema };
