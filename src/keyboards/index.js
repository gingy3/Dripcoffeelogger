const { PRIMARY_FLAVORS, FRUITY_SUBNOTES, BODY_NOTES, MAX_PRIMARY_FLAVORS } = require('../state/constants');

/**
 * Primary flavor multi-select keyboard.
 * Selected flavors are marked with ✅.
 * "Done" button is shown only when ≥1 flavor is selected.
 * Flavors are laid out 2 per row for readability.
 *
 * Callback prefix: "pf:"
 */
function primaryFlavorsKeyboard(selected = []) {
  const rows = [];

  for (let i = 0; i < PRIMARY_FLAVORS.length; i += 2) {
    const pair = PRIMARY_FLAVORS.slice(i, i + 2).map((flavor) => ({
      text: selected.includes(flavor) ? `✅ ${flavor}` : flavor,
      callback_data: `pf:${flavor}`,
    }));
    rows.push(pair);
  }

  if (selected.length > 0) {
    const atCap = selected.length >= MAX_PRIMARY_FLAVORS;
    rows.push([{
      text: atCap ? '✔️ Done (max reached)' : '✔️ Done',
      callback_data: 'pf:done',
    }]);
  }

  return { inline_keyboard: rows };
}

/**
 * Fruity sub-note keyboard — Berry or Citrus.
 * Single tap, no Done button needed.
 *
 * Callback prefix: "sn:"
 */
function fruitySubnoteKeyboard() {
  return {
    inline_keyboard: [
      FRUITY_SUBNOTES.map((note) => ({
        text: note,
        callback_data: `sn:${note}`,
      })),
    ],
  };
}

/**
 * Body / mouthfeel keyboard — Light, Smooth, Rich.
 * Single tap, no Done button needed.
 *
 * Callback prefix: "bn:"
 */
function bodyNoteKeyboard() {
  return {
    inline_keyboard: [
      BODY_NOTES.map((note) => ({
        text: note,
        callback_data: `bn:${note}`,
      })),
    ],
  };
}

/**
 * Optional note keyboard — just a Skip button.
 * User may also type a free-text note instead.
 *
 * Callback prefix: "on:"
 */
function optionalNoteKeyboard() {
  return {
    inline_keyboard: [[{ text: 'Skip ➡️', callback_data: 'on:skip' }]],
  };
}

/**
 * Rating keyboard — 1 through 5 with emoji labels.
 * Single row.
 *
 * Callback prefix: "rt:"
 */
function ratingKeyboard() {
  const labels = ['😕', '😐', '🙂', '😊', '🤩'];
  return {
    inline_keyboard: [
      [1, 2, 3, 4, 5].map((n) => ({
        text: `${n} ${labels[n - 1]}`,
        callback_data: `rt:${n}`,
      })),
    ],
  };
}

function logAnotherKeyboard() {
  return {
    inline_keyboard: [[
      { text: 'Log another ☕', callback_data: 'la:yes' },
    ]],
  };
}

module.exports = {
  primaryFlavorsKeyboard,
  fruitySubnoteKeyboard,
  bodyNoteKeyboard,
  optionalNoteKeyboard,
  ratingKeyboard,
  logAnotherKeyboard,
};
