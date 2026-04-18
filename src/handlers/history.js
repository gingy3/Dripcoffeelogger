const { getRecentLogs, countAllLogs } = require('../db/logs');

// ─── Formatting helpers ───────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Format a SQLite datetime string (YYYY-MM-DD HH:MM:SS) as "12 Apr 2025".
 */
function formatDate(createdAt) {
  const d = new Date(createdAt);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format a single log entry as a Telegram-ready string block.
 *
 * Example output:
 *   *Ethiopia Yirgacheffe*
 *   Fruity (Berry) · Light · ⭐⭐⭐⭐⭐
 *   12 Apr 2025
 */
function formatEntry(log) {
  const flavors = log.primary_flavors.join(', ');
  const sub     = log.sub_notes.length > 0 ? ` (${log.sub_notes.join(', ')})` : '';
  const body    = log.body_note ? ` · ${log.body_note}` : '';
  const stars   = '⭐'.repeat(log.rating);
  const note    = log.note ? `\n📝 _${escMd(log.note)}_` : '';
  const date    = formatDate(log.created_at);

  return `*${escMd(log.bean_name)}*\n${flavors}${sub}${body} · ${stars}${note}\n${date}`;
}

/**
 * Escape Telegram MarkdownV1 special characters in free-text fields.
 * Only * and _ need escaping in legacy Markdown mode.
 */
function escMd(str) {
  return str.replace(/[*_]/g, '\\$&');
}

/**
 * Build the full /history message from a list of log rows.
 */
function msgHistory(logs, totalCount) {
  if (logs.length === 0) {
    return `📋 *No logs yet.*\n\nUse /log to record your first coffee.`;
  }

  const header  = `📋 *Last ${logs.length} of ${totalCount} log${totalCount === 1 ? '' : 's'}*`;
  const divider = '─────────────────';
  const entries = logs.map(formatEntry).join(`\n${divider}\n`);

  return `${header}\n${divider}\n${entries}`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * /history command handler.
 * Shows the 10 most recent logs, newest first.
 *
 * @param {TelegramBot} bot
 * @param {Message}     msg
 */
async function handleHistory(bot, msg) {
  const userId    = msg.from.id;
  const logs      = getRecentLogs(userId, 10);
  const totalCount = countAllLogs(userId);

  await bot.sendMessage(msg.chat.id, msgHistory(logs, totalCount), {
    parse_mode: 'Markdown',
  });
}

module.exports = { handleHistory, msgHistory, formatEntry };
