/**
 * Conversation Context Service — Session Memory for Conversational Search
 *
 * Maintains search context per session to enable follow-up queries:
 *   "I want a thriller" → "make it less violent" → "but funnier"
 *
 * Uses in-memory Map with TTL-based cleanup.
 */

import { randomUUID } from "crypto";

// Session TTL: 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;

// Cleanup interval: every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * @typedef {object} SessionData
 * @property {object} lastIntent   - Previous parsed intent
 * @property {string} lastQuery    - Previous raw query
 * @property {number} updatedAt    - Timestamp of last update
 * @property {number} turnCount    - Number of queries in this session
 */

/** @type {Map<string, SessionData>} */
const sessions = new Map();

// Periodic cleanup of expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of sessions) {
    if (now - data.updatedAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS);

// ── Follow-up detection patterns ──
const FOLLOW_UP_PATTERNS = [
  /^(?:but|and|also|make\s+it|change|switch|however|instead|actually)/i,
  /^(?:less|more|not\s+(?:so|too|as)|without|with\s+more|with\s+less)/i,
  /^(?:same\s+but|similar\s+but|like\s+(?:that|those|the\s+last)|keep)/i,
  /^(?:shorter|longer|funnier|darker|lighter|scarier|happier|sadder)/i,
  /(?:previous|last\s+(?:one|result|search)|before)/i,
  /^(?:something\s+(?:else|different)|try\s+(?:another|different))/i,
  /^(?:no,?\s+(?:i\s+(?:want|mean|meant))|not\s+(?:that|those|this))/i,
  /(?:like\s+last\s+one\s+but|like\s+(?:the\s+)?previous\s+but)/i,
];

/**
 * Check if a query looks like a follow-up to a previous search.
 * @param {string} query
 * @returns {boolean}
 */
export function isFollowUp(query) {
  if (!query || typeof query !== "string") return false;
  const q = query.trim().toLowerCase();
  return FOLLOW_UP_PATTERNS.some(p => p.test(q));
}

/**
 * Get or create a session.
 * @param {string|null} sessionId
 * @returns {{ sessionId: string, session: SessionData|null }}
 */
export function getOrCreateSession(sessionId) {
  if (sessionId && sessions.has(sessionId)) {
    return { sessionId, session: sessions.get(sessionId) };
  }
  const newId = sessionId || randomUUID();
  return { sessionId: newId, session: null };
}

/**
 * Save the current intent as session context.
 * @param {string} sessionId
 * @param {object} intent
 * @param {string} query
 */
export function saveContext(sessionId, intent, query) {
  const existing = sessions.get(sessionId);
  sessions.set(sessionId, {
    lastIntent: intent,
    lastQuery: query,
    updatedAt: Date.now(),
    turnCount: (existing?.turnCount || 0) + 1,
  });
}

/**
 * Merge a new intent with the previous session context.
 * Previous intent values are kept as defaults; new values override.
 *
 * @param {object} prevIntent - Previous session intent
 * @param {object} newIntent  - Newly parsed intent
 * @returns {object} Merged intent
 */
export function mergeIntent(prevIntent, newIntent) {
  const merged = { ...newIntent };

  // Keep previous genres if new query didn't specify any
  if (merged.genres.length === 0 && prevIntent.genres?.length > 0) {
    merged.genres = [...prevIntent.genres];
  }

  // Keep previous reference title if not overridden
  if (!merged.referenceTitle && prevIntent.referenceTitle) {
    merged.referenceTitle = prevIntent.referenceTitle;
  }

  // Keep previous runtime hint if not overridden
  if (!merged.runtimeHint && prevIntent.runtimeHint) {
    merged.runtimeHint = prevIntent.runtimeHint;
  }

  // Keep previous constraints if not overridden
  if (Object.keys(merged.constraints || {}).length === 0 && prevIntent.constraints) {
    merged.constraints = { ...prevIntent.constraints };
  }

  // Merge moods: combine previous + new, deduplicate
  if (prevIntent.moods?.length > 0) {
    const allMoods = [...new Set([...prevIntent.moods, ...merged.moods])];
    merged.moods = allMoods;
  }

  // Merge contexts
  if (prevIntent.contexts?.length > 0 && merged.contexts?.length === 0) {
    merged.contexts = [...prevIntent.contexts];
  }

  // Merge keywords: combine, deduplicate
  if (prevIntent.keywords?.length > 0) {
    merged.keywords = [...new Set([...prevIntent.keywords, ...merged.keywords])];
  }

  return merged;
}

/**
 * Generate a human-readable summary of how context was applied.
 * @param {object} prevIntent
 * @param {object} mergedIntent
 * @returns {string}
 */
export function getContextSummary(prevIntent, mergedIntent) {
  const parts = [];

  if (prevIntent.genres?.length > 0 && mergedIntent.genres.some(g => prevIntent.genres.includes(g))) {
    parts.push(`keeping ${prevIntent.genres.join(", ")} genre`);
  }

  if (prevIntent.referenceTitle && mergedIntent.referenceTitle === prevIntent.referenceTitle) {
    parts.push(`still based on "${prevIntent.referenceTitle}"`);
  }

  if (mergedIntent.moods.length > prevIntent.moods?.length) {
    const newMoods = mergedIntent.moods.filter(m => !prevIntent.moods?.includes(m));
    if (newMoods.length > 0) parts.push(`added ${newMoods.join(", ")} mood`);
  }

  if (parts.length === 0) return "Refining your previous search";
  return "Refining: " + parts.join(", ");
}
