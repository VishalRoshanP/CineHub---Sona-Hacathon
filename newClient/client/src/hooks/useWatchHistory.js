/**
 * Watch History Hook — localStorage-based movie view tracking
 *
 * Tracks the last 30 movies the user clicked on.
 */

const STORAGE_KEY = "cinehub_watch_history";
const MAX_HISTORY = 30;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch { /* quota exceeded */ }
}

/**
 * Add a movie to watch history.
 * Moves it to the front if already exists.
 */
export function addToHistory(movie) {
  if (!movie) return;
  const id = movie._id || movie.id;
  const history = loadHistory();

  // Remove existing entry if present
  const filtered = history.filter(m => (m._id || m.id) !== id);

  // Add to front with timestamp
  const entry = {
    _id: id,
    title: movie.title,
    year: movie.year,
    poster: movie.poster || movie.poster_url,
    genres: movie.genres,
    runtime: movie.runtime,
    imdb: movie.imdb,
    viewedAt: Date.now(),
  };

  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  saveHistory(updated);
  return updated;
}

/**
 * Get the watch history.
 */
export function getHistory() {
  return loadHistory();
}

/**
 * Clear all watch history.
 */
export function clearHistory() {
  saveHistory([]);
}
