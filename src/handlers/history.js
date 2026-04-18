const { getRecentLogs, countAllLogs } = require('../db/logs');

// ─── Formatting helpers ───────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(createdAt) {
  const d = new Date(createdAt);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function escMd(str) {
  return String(str).replace(/[*_]/g, '\\$&');
}

function formatEntry(log) {
  const flavors  = log.primary_flavors.join(', ');
  const sub      = log.sub_notes.length > 0 ? ` (${log.sub_notes.join(', ')})` : '';
  const bodyLine = log.body_note ? `${flavors}${sub} · ${log.body_note}` : `${flavors}${sub}`;
  const stars    = '⭐'.repeat(log.rating);

  const lines = [
    `*${escMd(log.bean_name)}*`,
    stars,
    bodyLine,
    log.note ? escMd(log.note) : null,
    formatDate(log.created_at),
  ].filter(Boolean);

  return lines.join('\n');
}

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

async function handleHistory(bot, msg) {
  const userId     = msg.from.id;
  const logs       = getRecentLogs(userId, 10);
  const totalCount = countAllLogs(userId);

  await bot.sendMessage(msg.chat.id, msgHistory(logs, totalCount), {
    parse_mode: 'Markdown',
  });
}

module.exports = { handleHistory, msgHistory, formatEntry };
