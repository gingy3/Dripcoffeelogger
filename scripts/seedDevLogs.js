/**
 * @dev-only
 * Seeds qualifying logs for testing milestone and /profile behavior.
 *
 * TWO MODES — set via MODE env var:
 *
 *   MODE=9  (default)
 *     Seeds 9 qualifying logs.
 *     Use when testing the milestone message: log the 10th coffee manually
 *     in Telegram so checkMilestone() fires naturally through the bot.
 *     profile_unlocked is left as false.
 *
 *   MODE=10
 *     Seeds 10 qualifying logs AND sets profile_unlocked = true.
 *     Use when testing /profile output immediately — no bot interaction needed.
 *     profile_unlocked is set to true so the bot will NOT fire a false
 *     milestone message if you later log an 11th coffee through Telegram.
 *
 * HOW TO USE:
 *   TELEGRAM_USER_ID=<your_id> node scripts/seedDevLogs.js           (9-log mode)
 *   TELEGRAM_USER_ID=<your_id> MODE=10 node scripts/seedDevLogs.js   (10-log mode)
 *
 * HOW TO FIND YOUR TELEGRAM USER ID:
 *   Message @userinfobot on Telegram — it replies with your numeric user ID.
 *
 * REMOVE BEFORE PRODUCTION:
 *   Delete this file and the /scripts directory entirely.
 *   It has no imports in any production path so removal is safe.
 */

// ─── Dev guard ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error('❌  seedDevLogs must not run in production. Aborting.');
  process.exit(1);
}

require('dotenv').config();

const { initSchema }                        = require('../src/db/schema');
const { upsertUser, markProfileUnlocked }   = require('../src/db/users');
const { insertLog, getQualifyingLogs }      = require('../src/db/logs');

// ─── Seed data (10 entries, all rating >= 3) ──────────────────────────────────
// Produces a clear Bright & Fruity profile with berry-forward keyword chain.
// Mode 9 uses the first 9 entries; Mode 10 uses all 10.

const SEED_LOGS = [
  { bean_name: 'Ethiopia Yirgacheffe', primary_flavors: ['Fruity'],           sub_notes: ['Berry'],  body_note: 'Light',  note: 'Bright and clean',  rating: 5 },
  { bean_name: 'Kenya AA',             primary_flavors: ['Fruity'],           sub_notes: ['Citrus'], body_note: 'Light',  note: null,                 rating: 4 },
  { bean_name: 'Rwanda Nyamasheke',    primary_flavors: ['Fruity', 'Floral'], sub_notes: ['Berry'],  body_note: 'Light',  note: 'Floral finish',      rating: 5 },
  { bean_name: 'Colombia Huila',       primary_flavors: ['Fruity'],           sub_notes: ['Berry'],  body_note: 'Light',  note: null,                 rating: 4 },
  { bean_name: 'Burundi Kayanza',      primary_flavors: ['Fruity'],           sub_notes: ['Citrus'], body_note: 'Smooth', note: 'Juicy',              rating: 4 },
  { bean_name: 'Guatemala Antigua',    primary_flavors: ['Chocolatey'],       sub_notes: [],         body_note: 'Smooth', note: null,                 rating: 3 },
  { bean_name: 'Brazil Cerrado',       primary_flavors: ['Nutty'],            sub_notes: [],         body_note: 'Smooth', note: 'Mild and easy',      rating: 3 },
  { bean_name: 'Ethiopia Sidama',      primary_flavors: ['Fruity', 'Floral'], sub_notes: ['Berry'],  body_note: 'Light',  note: null,                 rating: 5 },
  { bean_name: 'Panama Geisha',        primary_flavors: ['Floral'],           sub_notes: [],         body_note: 'Light',  note: 'Tea-like',           rating: 4 },
  // 10th entry — only inserted in MODE=10
  { bean_name: 'Ecuador Pichincha',    primary_flavors: ['Fruity'],           sub_notes: ['Berry'],  body_note: 'Light',  note: 'Stone fruit vibes',  rating: 4 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

const userId = parseInt(process.env.TELEGRAM_USER_ID, 10);
if (!userId || isNaN(userId)) {
  console.error('❌  Set TELEGRAM_USER_ID=<your_numeric_id> before running this script.');
  console.error('    Example: TELEGRAM_USER_ID=123456789 node scripts/seedDevLogs.js');
  process.exit(1);
}

const mode = process.env.MODE === '10' ? 10 : 9;
const logsToSeed = SEED_LOGS.slice(0, mode);

initSchema();
upsertUser(userId, 'DevUser');

const before = getQualifyingLogs(userId).count;
console.log(`\n🌱 Seed mode: ${mode} logs  |  user: ${userId}`);
console.log(`   Qualifying logs before: ${before}\n`);

for (const entry of logsToSeed) {
  insertLog(userId, entry);
  console.log(`   ✅ ${entry.bean_name.padEnd(24)} ${entry.primary_flavors.join(', ')}${entry.sub_notes.length ? ' (' + entry.sub_notes.join(', ') + ')' : ''} — ⭐${entry.rating}`);
}

const after = getQualifyingLogs(userId).count;
console.log(`\n   Qualifying logs after: ${after}`);

if (mode === 10) {
  markProfileUnlocked(userId);
  console.log(`   profile_unlocked set to true`);
  console.log(`\n✅ Ready. Send /profile to your bot to see the full profile.`);
  console.log(`   Logging more coffees via Telegram will NOT re-trigger the milestone.\n`);
} else {
  console.log(`   profile_unlocked: false (untouched)`);
  console.log(`\n✅ Ready. Log one more coffee in Telegram to trigger the milestone message.`);
  console.log(`   The 10th log must be rated >= 3 to qualify.\n`);
}
