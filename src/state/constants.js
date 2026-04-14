/**
 * All valid conversation steps.
 * The session's `step` field must always be one of these values.
 */
const STEPS = Object.freeze({
  IDLE:                    'idle',
  AWAITING_BEAN_NAME:      'awaiting_bean_name',
  AWAITING_PRIMARY_FLAVORS:'awaiting_primary_flavors',
  AWAITING_FRUITY_SUBNOTE: 'awaiting_fruity_subnote',
  AWAITING_BODY_NOTE:      'awaiting_body_note',
  AWAITING_OPTIONAL_NOTE:  'awaiting_optional_note',
  AWAITING_RATING:         'awaiting_rating',
});

/** Selectable primary flavor options. */
const PRIMARY_FLAVORS = Object.freeze([
  'Fruity',
  'Chocolatey',
  'Nutty',
  'Floral',
  'Caramel',
  'Roasted',
  'Bitter',
]);

/** Max simultaneous primary flavor selections. */
const MAX_PRIMARY_FLAVORS = 2;

/** Fruity sub-note options. Shown only when Fruity is selected. */
const FRUITY_SUBNOTES = Object.freeze(['Berry', 'Citrus']);

/** Body / mouthfeel options. */
const BODY_NOTES = Object.freeze(['Light', 'Smooth', 'Rich']);

/** Minimum rating that counts toward a taste profile. */
const QUALIFYING_RATING = 3;

/** Number of qualifying logs needed to unlock a profile. */
const PROFILE_THRESHOLD = 10;

module.exports = {
  STEPS,
  PRIMARY_FLAVORS,
  MAX_PRIMARY_FLAVORS,
  FRUITY_SUBNOTES,
  BODY_NOTES,
  QUALIFYING_RATING,
  PROFILE_THRESHOLD,
};
