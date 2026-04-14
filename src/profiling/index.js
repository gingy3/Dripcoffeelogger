/**
 * Profiling engine.
 *
 * Input:  qualifying logs (rating >= 3) — already filtered by getQualifyingLogs()
 * Output: { topFlavors, dominantBody, tasteType, keywordChain, scores }
 *
 * No I/O, no Telegram, no DB. Pure function.
 */

const { buildKeywordChainWithSubNote } = require('./keywordChain');

// ─── Weighting ────────────────────────────────────────────────────────────────

const WEIGHTS = { 3: 1, 4: 1.5, 5: 1.5 };
function weight(rating) { return WEIGHTS[rating] ?? 1; }

// ─── Flavor → group mapping ───────────────────────────────────────────────────

const FLAVOR_GROUP = {
  Fruity:     'Fruity',
  Chocolatey: 'Chocolate',
  Nutty:      'Chocolate',
  Floral:     'Floral',
  Caramel:    'Sweet',
  Roasted:    'Roasted',
  Bitter:     'Roasted',
};

// ─── Taste type rules ─────────────────────────────────────────────────────────
// Evaluated in order; first match wins.
// Receives normalized group scores (0–1).

const TASTE_TYPES = [
  { name: 'Bright & Fruity',     match: (s) => leading(s, 'Fruity') },
  { name: 'Light & Delicate',    match: (s) => leading(s, 'Floral') || (s.Floral >= 0.6 && s.Fruity >= 0.6 && dominant(s, ['Floral', 'Fruity'])) },
  { name: 'Smooth & Comforting', match: (s) => leading(s, 'Chocolate') },
  { name: 'Bold & Heavy',        match: (s) => leading(s, 'Roasted') },
  { name: 'Sweet & Balanced',    match: (s) => leading(s, 'Sweet') || (s.Sweet ?? 0) >= 0.5 },
];

const FALLBACK_TYPE = 'Smooth & Comforting';

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {Array} logs  - rows from getQualifyingLogs(), already parsed
 * @returns {{
 *   topFlavors:   string[],
 *   dominantBody: string,
 *   tasteType:    string,
 *   keywordChain: string,
 *   scores:       { flavorScores, groupScores, bodyCount }
 * }}
 */
function generateProfile(logs) {
  if (!logs || logs.length === 0) {
    throw new Error('generateProfile requires at least one qualifying log.');
  }

  const flavorScores = {};
  const groupScores  = {};
  const bodyCount    = {};

  for (const log of logs) {
    const w = weight(log.rating);
    for (const flavor of log.primary_flavors) {
      flavorScores[flavor] = (flavorScores[flavor] ?? 0) + w;
      const group = FLAVOR_GROUP[flavor];
      if (group) groupScores[group] = (groupScores[group] ?? 0) + w;
    }
    if (log.body_note) {
      bodyCount[log.body_note] = (bodyCount[log.body_note] ?? 0) + 1;
    }
  }

  // Top 2–3 flavors: always include top 2, 3rd only if score >= 50% of top
  const sortedFlavors = Object.entries(flavorScores).sort((a, b) => b[1] - a[1]);
  const topScore      = sortedFlavors[0]?.[1] ?? 0;
  const topFlavors    = sortedFlavors
    .slice(0, 3)
    .filter(([, score], i) => i < 2 || score >= topScore * 0.5)
    .map(([flavor]) => flavor);

  const dominantBody = Object.entries(bodyCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Smooth';

  const maxGroupScore    = Math.max(...Object.values(groupScores), 1);
  const normalizedScores = Object.fromEntries(
    Object.entries(groupScores).map(([k, v]) => [k, v / maxGroupScore])
  );

  const matchedType = TASTE_TYPES.find((t) => t.match(normalizedScores))?.name
    ?? FALLBACK_TYPE;

  // Most frequent sub-note for keyword personalization
  const subNoteCounts = {};
  for (const log of logs) {
    for (const sn of log.sub_notes) {
      subNoteCounts[sn] = (subNoteCounts[sn] ?? 0) + 1;
    }
  }
  const topSubNote = Object.entries(subNoteCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0]?.toLowerCase() ?? null;

  const profile = {
    topFlavors,
    dominantBody,
    tasteType:    matchedType,
    keywordChain: '',   // set below after profile object exists
    scores: { flavorScores, groupScores, bodyCount },
  };

  profile.keywordChain = buildKeywordChainWithSubNote(profile, topSubNote);

  return profile;
}

// ─── Rule helpers ─────────────────────────────────────────────────────────────

function leading(scores, group) {
  if (!(scores[group] > 0)) return false;
  return Object.entries(scores).every(([k, v]) => k === group || scores[group] > v);
}

function dominant(scores, groups) {
  const inGroup  = groups.reduce((sum, g) => sum + (scores[g] ?? 0), 0);
  const outGroup = Object.entries(scores)
    .filter(([k]) => !groups.includes(k))
    .reduce((sum, [, v]) => sum + v, 0);
  return inGroup > outGroup;
}

module.exports = { generateProfile };
