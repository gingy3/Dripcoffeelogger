/**
 * Keyword chain generator.
 *
 * Accepts the output of generateProfile() and returns a purchase-ready
 * descriptor string in the format:
 *   [Roast], [Flavor], [Acidity], [Body], [Finish?]
 *
 * This is extracted from profiling/index.js so it can be tested,
 * read, and modified independently of the scoring logic.
 */

// ─── Templates ────────────────────────────────────────────────────────────────
//
// Each entry maps a tasteType name to a builder function.
// ctx = { topFlavor: string, subNote: string|null, dominantBody: string }
//
// subNote   — most frequent fruity sub-note ('berry' | 'citrus' | null)
//             used to personalize "fruit-forward" → "berry-forward"
// topFlavor — highest-scored individual flavor, used where the template
//             benefits from specificity (e.g. "nutty/chocolate" vs "chocolate")

const TEMPLATES = {
  'Bright & Fruity': (ctx) => {
    const flavor = ctx.subNote ?? 'fruit';
    return `Light roast, ${flavor}-forward, bright acidity, light body, clean finish`;
  },

  'Light & Delicate': () =>
    'Light roast, floral, soft acidity, tea-like body',

  'Smooth & Comforting': (ctx) => {
    const flavor = ctx.topFlavor === 'Nutty' ? 'nutty/chocolate' : 'chocolate';
    return `Medium roast, ${flavor}, low acidity, smooth body`;
  },

  'Bold & Heavy': () =>
    'Dark roast, intense, low acidity, heavy body, strong finish',

  'Sweet & Balanced': () =>
    'Medium roast, caramel sweetness, balanced acidity, rounded body',
};

const FALLBACK = () => 'Medium roast, balanced, low acidity, smooth body';

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Build the keyword chain from a completed profile.
 *
 * @param {{
 *   tasteType:    string,
 *   topFlavors:   string[],
 *   dominantBody: string,
 *   scores:       { flavorScores, groupScores, bodyCount }
 * }} profile  - return value of generateProfile()
 *
 * @returns {string}
 */
function buildKeywordChain(profile) {
  const template = TEMPLATES[profile.tasteType] ?? FALLBACK;

  // Most frequent fruity sub-note across all logs — already computed by
  // generateProfile and stored in scores, but we derive from topFlavors here
  // to keep this function self-contained.
  // The profiling engine passes subNote via keywordChain at generation time,
  // so this function is the canonical source when called standalone.
  const topFlavor = profile.topFlavors[0] ?? null;

  // Recover subNote from scores if available (set during profiling)
  const bodyCountEntries = Object.entries(profile.scores?.bodyCount ?? {});
  const dominantBody = bodyCountEntries.length > 0
    ? bodyCountEntries.sort((a, b) => b[1] - a[1])[0][0]
    : profile.dominantBody;

  // subNote is not stored directly on the profile — callers that need
  // sub-note personalization should pass it explicitly via the second arg.
  return template({ topFlavor, subNote: null, dominantBody });
}

/**
 * Build with an explicit subNote override (e.g. 'berry' or 'citrus').
 * Used by generateProfile() internally and by tests.
 *
 * @param {object} profile
 * @param {string|null} subNote
 * @returns {string}
 */
function buildKeywordChainWithSubNote(profile, subNote) {
  const template  = TEMPLATES[profile.tasteType] ?? FALLBACK;
  const topFlavor = profile.topFlavors[0] ?? null;
  return template({ topFlavor, subNote, dominantBody: profile.dominantBody });
}

module.exports = { buildKeywordChain, buildKeywordChainWithSubNote, TEMPLATES };
