/**
 * Hour adjustments system
 * Allows admins to add/subtract hours for drivers
 *
 * Storage options:
 * 1. ADJUSTMENTS_JSON env var - for Vercel (read-only, set via dashboard)
 * 2. Local JSON file - for local development
 * 3. Vercel KV/Redis - for production persistence (future)
 */

const fs = require('fs');
const path = require('path');

const ADJUSTMENTS_FILE = process.env.ADJUSTMENTS_FILE || path.join(process.cwd(), 'data', 'adjustments.json');

// In-memory cache for adjustments (persists during serverless function lifecycle)
let adjustmentsCache = null;

// Day key (YYYY-MM-DD) formatter pinned to business timezone
const DAY_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function isValidDayKey(dayKey) {
  return typeof dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dayKey);
}

function getDayKeyFromDateString(dateString) {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  return DAY_KEY_FORMATTER.format(d); // YYYY-MM-DD
}

/**
 * Get all adjustments
 * @returns {Object} Adjustments object { username: { YYYY-MM-DD: { hours, reason, updatedAt } } }
 */
function getAdjustments() {
  try {
    // Use cache if available (for runtime modifications on Vercel)
    if (adjustmentsCache !== null) {
      return adjustmentsCache;
    }

    // Check if adjustments from environment variable
    if (process.env.ADJUSTMENTS_JSON) {
      adjustmentsCache = JSON.parse(process.env.ADJUSTMENTS_JSON);
      return adjustmentsCache;
    }

    // Try to read from file (local development)
    if (fs.existsSync(ADJUSTMENTS_FILE)) {
      const data = fs.readFileSync(ADJUSTMENTS_FILE, 'utf8');
      adjustmentsCache = JSON.parse(data);
      return adjustmentsCache;
    }
  } catch (error) {
    console.error('Error reading adjustments:', error);
  }

  adjustmentsCache = {};
  return {};
}

/**
 * Save adjustments
 * @param {Object} adjustments - Adjustments object
 */
function saveAdjustments(adjustments) {
  // Update in-memory cache
  adjustmentsCache = adjustments;

  try {
    // Try to save to file (works in local dev, fails silently on Vercel)
    const dir = path.dirname(ADJUSTMENTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(ADJUSTMENTS_FILE, JSON.stringify(adjustments, null, 2));
    console.log('Adjustments saved to file');
    return true;
  } catch (error) {
    // On Vercel, filesystem is read-only - adjustments stay in memory
    // They'll persist for the lifetime of the serverless function
    console.log('Adjustments saved to memory (filesystem read-only)');
    console.log('To persist permanently, update ADJUSTMENTS_JSON env var with:');
    console.log(JSON.stringify(adjustments));
    return true;
  }
}

/**
 * Get adjustment for a specific driver and day
 * @param {string} username - Driver username
 * @param {string} dayKey - Day key in YYYY-MM-DD format
 * @returns {Object|null} { hours, reason, updatedAt } or null
 */
function getAdjustment(username, dayKey) {
  const adjustments = getAdjustments();
  if (!username || !isValidDayKey(dayKey)) return null;
  const entry = adjustments[username]?.[dayKey] || null;
  if (!entry || typeof entry !== 'object') return null;
  if (entry.hours === undefined || entry.hours === null || !Number.isFinite(Number(entry.hours))) return null;
  return {
    hours: Number(entry.hours),
    reason: entry.reason || '',
    updatedAt: entry.updatedAt || null
  };
}

/**
 * Set adjustment for a driver and day
 * @param {string} username - Driver username
 * @param {string} dayKey - Day key in YYYY-MM-DD format
 * @param {number} hours - Adjustment hours (can be negative)
 * @param {string} reason - Reason for adjustment
 * @returns {boolean} Success
 */
function setAdjustment(username, dayKey, hours, reason = '') {
  if (!username || !isValidDayKey(dayKey)) {
    throw new Error('Invalid adjustment dayKey (expected YYYY-MM-DD)');
  }

  const adjustments = getAdjustments();

  if (!adjustments[username]) {
    adjustments[username] = {};
  }

  const hoursNum = Number(hours);

  // Entering 0 removes the adjustment for that day
  if (Number.isFinite(hoursNum) && hoursNum === 0) {
    delete adjustments[username][dayKey];
    if (Object.keys(adjustments[username]).length === 0) {
      delete adjustments[username];
    }
    return saveAdjustments(adjustments);
  }

  adjustments[username][dayKey] = {
    hours: Number.isFinite(hoursNum) ? hoursNum : 0,
    reason: reason || '',
    updatedAt: new Date().toISOString()
  };

  return saveAdjustments(adjustments);
}

/**
 * Apply per-day adjustments to a driver's hours for a month
 * @param {string} username - Driver username
 * @param {string} targetMonth - Month in YYYY-MM format
 * @param {number} calculatedHours - Hours calculated from routes
 * @param {Array} details - Route details array with `date` fields (ISO strings)
 * @returns {Object} { hours, totalAdjustment, adjustmentsByDay }
 */
function applyAdjustmentsForMonth(username, targetMonth, calculatedHours, details = []) {
  const adjustments = getAdjustments();
  const userAdjustments = adjustments[username] || {};

  const dayKeysInMonth = new Set();
  for (const d of Array.isArray(details) ? details : []) {
    const dayKey = getDayKeyFromDateString(d?.date);
    if (!dayKey) continue;
    if (dayKey.slice(0, 7) !== targetMonth) continue;
    dayKeysInMonth.add(dayKey);
  }

  let totalAdjustment = 0;
  const adjustmentsByDay = {};

  for (const dayKey of dayKeysInMonth) {
    const entry = userAdjustments[dayKey];
    if (!entry || typeof entry !== 'object') continue;
    const hours = Number(entry.hours);
    if (!Number.isFinite(hours) || hours === 0) continue;
    totalAdjustment += hours;
    adjustmentsByDay[dayKey] = {
      hours,
      reason: entry.reason || '',
      updatedAt: entry.updatedAt || null
    };
  }

  return {
    hours: calculatedHours + totalAdjustment,
    totalAdjustment: Number(totalAdjustment.toFixed(2)),
    adjustmentsByDay
  };
}

module.exports = {
  getAdjustments,
  getAdjustment,
  setAdjustment,
  applyAdjustmentsForMonth,
  getDayKeyFromDateString
};
