/**
 * 🎬 CineHub Demo Logger
 *
 * A structured logging system designed for hackathon demos.
 * Shows the complete data flow:
 *   Frontend → API Request → MongoDB Query → DB Result → API Response
 *
 * Toggle: Set LOG_ENABLED=false in .env to disable all demo logs.
 *
 * NOTE: chalk has been removed — uses plain console.log with emoji prefixes.
 */

// ── Toggle ─────────────────────────────────────────────
const LOG_ENABLED = process.env.LOG_ENABLED !== "false";

// ── Helpers ────────────────────────────────────────────
const divider  = "─".repeat(60);
const shortDiv = "· ".repeat(30);

function timestamp() {
  return `[${new Date().toLocaleTimeString()}]`;
}

function truncate(obj, maxLen = 500) {
  if (obj === undefined || obj === null) return "";
  try {
    const str = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    return str.length > maxLen ? str.slice(0, maxLen) + " ...(truncated)" : str;
  } catch {
    return String(obj);
  }
}

// ── Public API ─────────────────────────────────────────
const logger = {
  /**
   * Log an incoming HTTP request.
   */
  request(req) {
    if (!LOG_ENABLED) return;
    try {
      console.log("");
      console.log(divider);
      console.log(
        `${timestamp()} 🚀 REQUEST  [${req.method}] ${req.originalUrl}`
      );

      if (req.query && Object.keys(req.query).length) {
        console.log(`   Query:  ${JSON.stringify(req.query)}`);
      }
      if (req.params && Object.keys(req.params).length) {
        console.log(`   Params: ${JSON.stringify(req.params)}`);
      }
      if (req.body && Object.keys(req.body).length) {
        console.log(`   Body:   ${truncate(req.body, 300)}`);
      }
    } catch (e) {
      console.log(`${timestamp()} ⚠️  Logger.request error: ${e.message}`);
    }
  },

  /**
   * Log an outgoing HTTP response.
   */
  response(req, statusCode, body, durationMs) {
    if (!LOG_ENABLED) return;
    try {
      const resultCount =
        Array.isArray(body) ? body.length
        : Array.isArray(body?.results) ? body.results.length
        : null;

      console.log(shortDiv);
      console.log(
        `${timestamp()} 📤 RESPONSE [${statusCode}] ${req.originalUrl} ⏱ ${durationMs}ms` +
        (resultCount !== null ? ` (${resultCount} items)` : "")
      );
      console.log(divider);
      console.log("");
    } catch (e) {
      console.log(`${timestamp()} ⚠️  Logger.response error: ${e.message}`);
    }
  },

  /**
   * Log a Mongoose database query (used with mongoose.set("debug", ...)).
   */
  dbQuery(collectionName, method, query, doc) {
    if (!LOG_ENABLED) return;
    try {
      console.log(
        `${timestamp()} 🧠 DB QUERY  ${collectionName}.${method}(${truncate(query, 200)})`
      );
      if (doc && typeof doc === "object" && Object.keys(doc).length) {
        console.log(`   Doc: ${truncate(doc, 200)}`);
      }
    } catch (e) {
      console.log(`${timestamp()} ⚠️  Logger.dbQuery error: ${e.message}`);
    }
  },

  /**
   * Log data fetched from the database (controller level).
   */
  dbResult(label, data) {
    if (!LOG_ENABLED) return;
    try {
      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      console.log(
        `${timestamp()} 📦 DB RESULT ${label} → ${count} document(s)`
      );
    } catch (e) {
      console.log(`${timestamp()} ⚠️  Logger.dbResult error: ${e.message}`);
    }
  },

  /**
   * Log an error.
   */
  error(label, err) {
    // Always log errors regardless of toggle
    try {
      console.log(
        `${timestamp()} ❌ ERROR    ${label} → ${err?.message || err}`
      );
    } catch (e) {
      console.log(`${timestamp()} ⚠️  Logger.error error: ${e.message}`);
    }
  },
};

export default logger;
