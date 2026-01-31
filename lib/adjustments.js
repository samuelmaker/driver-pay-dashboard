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

/**
 * Get all adjustments
 * @returns {Object} Adjustments object { username: { month: hours } }
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
 * Get adjustment for a specific driver and month
 * @param {string} username - Driver username
 * @param {string} month - Month in YYYY-MM format
 * @returns {number} Adjustment hours (can be negative)
 */
function getAdjustment(username, month) {
  const adjustments = getAdjustments();
  return adjustments[username]?.[month] || 0;
}

/**
 * Set adjustment for a driver and month
 * @param {string} username - Driver username
 * @param {string} month - Month in YYYY-MM format
 * @param {number} hours - Adjustment hours (can be negative)
 * @param {string} reason - Reason for adjustment
 * @returns {boolean} Success
 */
function setAdjustment(username, month, hours, reason = '') {
  const adjustments = getAdjustments();

  if (!adjustments[username]) {
    adjustments[username] = {};
  }

  adjustments[username][month] = {
    hours: parseFloat(hours),
    reason,
    updatedAt: new Date().toISOString()
  };

  return saveAdjustments(adjustments);
}

/**
 * Apply adjustments to driver hours
 * @param {string} username - Driver username
 * @param {string} month - Month in YYYY-MM format
 * @param {number} calculatedHours - Hours calculated from routes
 * @returns {Object} { hours, adjustment, reason }
 */
function applyAdjustment(username, month, calculatedHours) {
  const adjustment = getAdjustment(username, month);

  if (typeof adjustment === 'object' && adjustment.hours !== undefined) {
    return {
      hours: calculatedHours + adjustment.hours,
      adjustment: adjustment.hours,
      reason: adjustment.reason || '',
      updatedAt: adjustment.updatedAt
    };
  }

  return {
    hours: calculatedHours,
    adjustment: 0,
    reason: '',
    updatedAt: null
  };
}

module.exports = {
  getAdjustments,
  getAdjustment,
  setAdjustment,
  applyAdjustment
};
