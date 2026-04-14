const { STEPS, MAX_PRIMARY_FLAVORS } = require('./constants');

/**
 * In-memory session store.
 * Key: userId (number)
 * Value: Session object (see createSession)
 *
 * Sessions exist only while a /log flow is active.
 * They are deleted on completion or when the user restarts with /log.
 */
const store = {};

// ─── Session lifecycle ────────────────────────────────────────────────────────

/**
 * Create a fresh session for a user, replacing any existing one.
 * Called when the user issues /log.
 *
 * @param {number} userId
 * @returns {Session}
 */
function createSession(userId) {
  const session = {
    step: STEPS.AWAITING_BEAN_NAME,
    data: {
      bean_name:       null,
      primary_flavors: [],   // string[], max 2
      sub_notes:       [],   // string[], populated only if Fruity selected
      body_note:       null, // string
      note:            null, // string | null
      rating:          null, // number 1–5
    },
  };
  store[userId] = session;
  return session;
}

/**
 * Retrieve the active session for a user, or null if none exists.
 *
 * @param {number} userId
 * @returns {Session | null}
 */
function getSession(userId) {
  return store[userId] ?? null;
}

/**
 * Delete the session for a user (after save or on /log restart).
 *
 * @param {number} userId
 */
function clearSession(userId) {
  delete store[userId];
}

// ─── State transitions ────────────────────────────────────────────────────────

/**
 * Advance session from AWAITING_BEAN_NAME → AWAITING_PRIMARY_FLAVORS.
 * Called when the user sends a text message while in the bean step.
 *
 * @param {number} userId
 * @param {string} beanName  - raw text from the user's message
 * @returns {Session}
 * @throws if no active session or wrong step
 */
function setBeanName(userId, beanName) {
  const session = requireStep(userId, STEPS.AWAITING_BEAN_NAME);
  session.data.bean_name = beanName.trim();
  session.step = STEPS.AWAITING_PRIMARY_FLAVORS;
  return session;
}

/**
 * Toggle a primary flavor selection (called on each button tap).
 * Enforces MAX_PRIMARY_FLAVORS cap — silently ignores if already at cap
 * and the flavor is not already selected (deselection always allowed).
 *
 * Returns an action descriptor so the caller knows what happened:
 *   { action: 'added' | 'removed' | 'capped', session }
 *
 * @param {number} userId
 * @param {string} flavor  - one of PRIMARY_FLAVORS
 * @returns {{ action: string, session: Session }}
 */
function togglePrimaryFlavor(userId, flavor) {
  const session = requireStep(userId, STEPS.AWAITING_PRIMARY_FLAVORS);
  const flavors = session.data.primary_flavors;
  const idx = flavors.indexOf(flavor);

  if (idx !== -1) {
    // Deselect
    flavors.splice(idx, 1);
    return { action: 'removed', session };
  }

  if (flavors.length >= MAX_PRIMARY_FLAVORS) {
    // Already at cap — caller should show a brief alert
    return { action: 'capped', session };
  }

  flavors.push(flavor);
  return { action: 'added', session };
}

/**
 * Confirm primary flavor selection and advance step.
 * Decides whether to go to fruity sub-note or straight to body note.
 *
 * @param {number} userId
 * @returns {Session}
 * @throws if no selections made
 */
function confirmPrimaryFlavors(userId) {
  const session = requireStep(userId, STEPS.AWAITING_PRIMARY_FLAVORS);

  if (session.data.primary_flavors.length === 0) {
    throw new SessionError('Select at least one flavor before continuing.');
  }

  const hasFruity = session.data.primary_flavors.includes('Fruity');
  session.step = hasFruity
    ? STEPS.AWAITING_FRUITY_SUBNOTE
    : STEPS.AWAITING_BODY_NOTE;

  return session;
}

/**
 * Set the fruity sub-note and advance to body note.
 * Called when the user taps Berry or Citrus.
 *
 * @param {number} userId
 * @param {string} subNote  - 'Berry' | 'Citrus'
 * @returns {Session}
 */
function setFruitySubnote(userId, subNote) {
  const session = requireStep(userId, STEPS.AWAITING_FRUITY_SUBNOTE);
  session.data.sub_notes = [subNote];
  session.step = STEPS.AWAITING_BODY_NOTE;
  return session;
}

/**
 * Set the body / mouthfeel note and advance to optional note.
 *
 * @param {number} userId
 * @param {string} bodyNote  - 'Light' | 'Smooth' | 'Rich'
 * @returns {Session}
 */
function setBodyNote(userId, bodyNote) {
  const session = requireStep(userId, STEPS.AWAITING_BODY_NOTE);
  session.data.body_note = bodyNote;
  session.step = STEPS.AWAITING_OPTIONAL_NOTE;
  return session;
}

/**
 * Set the optional free-text note (or null for skip) and advance to rating.
 *
 * @param {number} userId
 * @param {string | null} note
 * @returns {Session}
 */
function setOptionalNote(userId, note) {
  const session = requireStep(userId, STEPS.AWAITING_OPTIONAL_NOTE);
  session.data.note = note ?? null;
  session.step = STEPS.AWAITING_RATING;
  return session;
}

/**
 * Set the rating. Session is now complete — caller should save and clear it.
 *
 * @param {number} userId
 * @param {number} rating  - integer 1–5
 * @returns {Session}
 */
function setRating(userId, rating) {
  const session = requireStep(userId, STEPS.AWAITING_RATING);
  session.data.rating = rating;
  // Step stays AWAITING_RATING until caller explicitly clears.
  // Caller reads session.data, saves to DB, then calls clearSession().
  return session;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Retrieve a session and assert it's on the expected step.
 *
 * @param {number} userId
 * @param {string} expectedStep
 * @returns {Session}
 * @throws {SessionError}
 */
function requireStep(userId, expectedStep) {
  const session = store[userId];
  if (!session) {
    throw new SessionError('No active logging session. Use /log to start.');
  }
  if (session.step !== expectedStep) {
    throw new SessionError(
      `Expected step "${expectedStep}" but session is on "${session.step}".`
    );
  }
  return session;
}

class SessionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SessionError';
  }
}

module.exports = {
  // Lifecycle
  createSession,
  getSession,
  clearSession,
  // Transitions
  setBeanName,
  togglePrimaryFlavor,
  confirmPrimaryFlavors,
  setFruitySubnote,
  setBodyNote,
  setOptionalNote,
  setRating,
  // Error class (for instanceof checks in bot.js)
  SessionError,
};
