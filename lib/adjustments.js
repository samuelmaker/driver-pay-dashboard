/**
 * Hour adjustments system
 * Allows admins to add/subtract hours for drivers
 *
 * Storage options:
 * 1. ADJUSTMENTS_JSON env var - for Vercel (read-only, set via dashboard)
 * 2. Local JSON file - for local development
 * 3. Vercel KV/Redis - for production persistence (future)
 */

const fs = require("fs");
const path = require("path");

const ADJUSTMENTS_FILE =
  process.env.ADJUSTMENTS_FILE ||
  path.join(process.cwd(), "data", "adjustments.json");

/**
 * Calculate pay period date range for a given month
 * Pay periods run from 28th of previous month to 27th of current month
 *
 * @param {number} year - Year (e.g., 2026)
 * @param {number} month - Month (1-12) - this is the "pay month" that the period is named after
 * @returns {Object} { startDate: string (YYYY-MM-DD), endDate: string (YYYY-MM-DD) }
 */
function getPayPeriodRange(year, month) {
  // Start date: 28th of previous month
  let startYear = year;
  let startMonth = month - 1;
  if (startMonth < 1) {
    startMonth = 12;
    startYear = year - 1;
  }

  const startDate = `${startYear}-${String(startMonth).padStart(2, "0")}-28`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-27`;

  return { startDate, endDate };
}

/**
 * Check if a day key (YYYY-MM-DD) falls within a pay period
 * @param {string} dayKey - Day key in YYYY-MM-DD format
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {boolean}
 */
function isDayKeyInPayPeriod(dayKey, startDate, endDate) {
  if (!dayKey || !startDate || !endDate) return false;
  return dayKey >= startDate && dayKey <= endDate;
}

// In-memory cache for adjustments (persists during serverless function lifecycle)
let adjustmentsCache = null;

// Day key (YYYY-MM-DD) formatter pinned to business timezone
const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function isValidDayKey(dayKey) {
  return typeof dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dayKey);
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
      const data = fs.readFileSync(ADJUSTMENTS_FILE, "utf8");
      adjustmentsCache = JSON.parse(data);
      return adjustmentsCache;
    }
  } catch (error) {
    console.error("Error reading adjustments:", error);
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
    console.log("Adjustments saved to file");
    return true;
  } catch (error) {
    // On Vercel, filesystem is read-only - adjustments stay in memory
    // They'll persist for the lifetime of the serverless function
    console.log("Adjustments saved to memory (filesystem read-only)");
    console.log(
      "To persist permanently, update ADJUSTMENTS_JSON env var with:"
    );
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
  if (!entry || typeof entry !== "object") return null;
  if (
    entry.hours === undefined ||
    entry.hours === null ||
    !Number.isFinite(Number(entry.hours))
  )
    return null;
  return {
    hours: Number(entry.hours),
    reason: entry.reason || "",
    updatedAt: entry.updatedAt || null,
  };
}

/**
 * Set adjustment for a driver and day (legacy hour-based adjustment)
 * @param {string} username - Driver username
 * @param {string} dayKey - Day key in YYYY-MM-DD format
 * @param {number} hours - Adjustment hours (can be negative)
 * @param {string} reason - Reason for adjustment
 * @returns {boolean} Success
 */
function setAdjustment(username, dayKey, hours, reason = "") {
  if (!username || !isValidDayKey(dayKey)) {
    throw new Error("Invalid adjustment dayKey (expected YYYY-MM-DD)");
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

  // Preserve existing flags if present
  const existing = adjustments[username][dayKey] || {};

  adjustments[username][dayKey] = {
    hours: Number.isFinite(hoursNum) ? hoursNum : 0,
    reason: reason || "",
    updatedAt: new Date().toISOString(),
    adjustmentType: "hours",
    // Preserve flags
    flagged: existing.flagged || false,
    flagReason: existing.flagReason || null,
  };

  return saveAdjustments(adjustments);
}

/**
 * Set time-based adjustment for a driver and day
 * @param {string} username - Driver username
 * @param {string} dayKey - Day key in YYYY-MM-DD format
 * @param {number|null} adjustedStartTime - Adjusted start time (Unix seconds) or null
 * @param {number|null} adjustedEndTime - Adjusted end time (Unix seconds) or null
 * @param {number|null} originalStartTime - Original start time (Unix seconds) for reference
 * @param {number|null} originalEndTime - Original end time (Unix seconds) for reference
 * @param {string} reason - Reason for adjustment
 * @returns {boolean} Success
 */
function setTimeAdjustment(
  username,
  dayKey,
  adjustedStartTime,
  adjustedEndTime,
  originalStartTime,
  originalEndTime,
  reason = ""
) {
  if (!username || !isValidDayKey(dayKey)) {
    throw new Error("Invalid adjustment dayKey (expected YYYY-MM-DD)");
  }

  const adjustments = getAdjustments();

  if (!adjustments[username]) {
    adjustments[username] = {};
  }

  // Calculate hours from the time difference
  let hours = 0;
  if (adjustedStartTime != null && adjustedEndTime != null) {
    const durationSeconds = adjustedEndTime - adjustedStartTime;
    hours = durationSeconds / 3600;
  }

  // Calculate the original hours for comparison
  let originalHours = 0;
  if (originalStartTime != null && originalEndTime != null) {
    const originalDurationSeconds = originalEndTime - originalStartTime;
    originalHours = originalDurationSeconds / 3600;
  }

  // The adjustment is the difference between adjusted and original hours
  const hoursDiff = hours - originalHours;

  // If both times are null/cleared, remove the time adjustment but keep flags
  if (adjustedStartTime == null && adjustedEndTime == null) {
    const existing = adjustments[username][dayKey] || {};
    if (existing.flagged) {
      // Keep only the flag data
      adjustments[username][dayKey] = {
        hours: 0,
        reason: "",
        updatedAt: new Date().toISOString(),
        adjustmentType: "hours",
        flagged: existing.flagged,
        flagReason: existing.flagReason,
      };
    } else {
      delete adjustments[username][dayKey];
      if (Object.keys(adjustments[username]).length === 0) {
        delete adjustments[username];
      }
    }
    return saveAdjustments(adjustments);
  }

  // Preserve existing flags if present
  const existing = adjustments[username][dayKey] || {};

  adjustments[username][dayKey] = {
    adjustedStartTime,
    adjustedEndTime,
    originalStartTime,
    originalEndTime,
    hours: Number.isFinite(hoursDiff) ? parseFloat(hoursDiff.toFixed(2)) : 0,
    reason: reason || "",
    updatedAt: new Date().toISOString(),
    adjustmentType: "time",
    // Preserve flags
    flagged: existing.flagged || false,
    flagReason: existing.flagReason || null,
  };

  return saveAdjustments(adjustments);
}

/**
 * Set flag for a driver and day
 * @param {string} username - Driver username
 * @param {string} dayKey - Day key in YYYY-MM-DD format
 * @param {boolean} flagged - Whether the day is flagged
 * @param {string|null} flagReason - Reason for flagging
 * @returns {boolean} Success
 */
function setFlag(username, dayKey, flagged, flagReason = null) {
  if (!username || !isValidDayKey(dayKey)) {
    throw new Error("Invalid flag dayKey (expected YYYY-MM-DD)");
  }

  const adjustments = getAdjustments();

  if (!adjustments[username]) {
    adjustments[username] = {};
  }

  const existing = adjustments[username][dayKey] || {};

  // If unflagging and no other adjustment data, remove the entry
  if (!flagged) {
    const hasHourAdjustment = existing.hours != null && existing.hours !== 0;
    const hasTimeAdjustment = existing.adjustmentType === "time" &&
      (existing.adjustedStartTime || existing.adjustedEndTime);

    // If no meaningful adjustment exists, remove the entry entirely
    if (!hasHourAdjustment && !hasTimeAdjustment) {
      delete adjustments[username][dayKey];
      if (Object.keys(adjustments[username]).length === 0) {
        delete adjustments[username];
      }
      return saveAdjustments(adjustments);
    }

    // Otherwise just clear the flag from existing entry
    adjustments[username][dayKey] = {
      ...existing,
      flagged: false,
      flagReason: null,
      updatedAt: new Date().toISOString(),
    };
    return saveAdjustments(adjustments);
  }

  // Update the flag on existing entry or create new entry
  adjustments[username][dayKey] = {
    ...existing,
    hours: existing.hours || 0,
    reason: existing.reason || "",
    updatedAt: new Date().toISOString(),
    adjustmentType: existing.adjustmentType || "hours",
    flagged: !!flagged,
    flagReason: flagged ? (flagReason || null) : null,
  };

  return saveAdjustments(adjustments);
}

/**
 * Get flags for a driver in a pay period
 * @param {string} username - Driver username
 * @param {string} targetMonth - Month in YYYY-MM format
 * @returns {Object} Flagged days { dayKey: { flagged, flagReason } }
 */
function getFlags(username, targetMonth) {
  const adjustments = getAdjustments();
  const userAdjustments = adjustments[username] || {};

  const [year, month] = targetMonth.split("-").map(Number);
  const { startDate, endDate } = getPayPeriodRange(year, month);

  const flaggedDays = {};

  for (const [dayKey, entry] of Object.entries(userAdjustments)) {
    if (!isDayKeyInPayPeriod(dayKey, startDate, endDate)) continue;
    if (entry && entry.flagged) {
      flaggedDays[dayKey] = {
        flagged: true,
        flagReason: entry.flagReason || null,
      };
    }
  }

  return flaggedDays;
}

/**
 * Apply per-day adjustments to a driver's hours for a pay period
 * Pay periods run from 28th of previous month to 27th of current month
 *
 * @param {string} username - Driver username
 * @param {string} targetMonth - Month in YYYY-MM format (the "pay month")
 * @param {number} calculatedHours - Hours calculated from routes
 * @param {Array} details - Route details array with `date` fields (ISO strings)
 * @returns {Object} { hours, totalAdjustment, adjustmentsByDay, flaggedDays }
 */
function applyAdjustmentsForMonth(
  username,
  targetMonth,
  calculatedHours,
  details = []
) {
  const adjustments = getAdjustments();
  const userAdjustments = adjustments[username] || {};

  // Parse target month and get pay period date range
  const [year, month] = targetMonth.split("-").map(Number);
  const { startDate, endDate } = getPayPeriodRange(year, month);

  // Collect day keys from route details that fall within the pay period
  const dayKeysInPeriod = new Set();
  for (const d of Array.isArray(details) ? details : []) {
    const dayKey = getDayKeyFromDateString(d?.date);
    if (!dayKey) continue;
    // Check if the day key falls within the pay period (28th prev month to 27th current month)
    if (!isDayKeyInPayPeriod(dayKey, startDate, endDate)) continue;
    dayKeysInPeriod.add(dayKey);
  }

  // Also check for adjustments that fall within the pay period but may not have routes
  // (e.g., adjustments for days with no completed routes)
  for (const dayKey of Object.keys(userAdjustments)) {
    if (isDayKeyInPayPeriod(dayKey, startDate, endDate)) {
      dayKeysInPeriod.add(dayKey);
    }
  }

  let totalAdjustment = 0;
  const adjustmentsByDay = {};
  const flaggedDays = {};

  for (const dayKey of dayKeysInPeriod) {
    const entry = userAdjustments[dayKey];
    if (!entry || typeof entry !== "object") continue;

    // Handle flags
    if (entry.flagged) {
      flaggedDays[dayKey] = {
        flagged: true,
        flagReason: entry.flagReason || null,
      };
    }

    // Handle adjustments (both legacy hours and time-based)
    const hours = Number(entry.hours);
    if (!Number.isFinite(hours) || hours === 0) continue;
    totalAdjustment += hours;
    adjustmentsByDay[dayKey] = {
      hours,
      reason: entry.reason || "",
      updatedAt: entry.updatedAt || null,
      adjustmentType: entry.adjustmentType || "hours",
      // Include time data for time-based adjustments
      ...(entry.adjustmentType === "time" && {
        adjustedStartTime: entry.adjustedStartTime,
        adjustedEndTime: entry.adjustedEndTime,
        originalStartTime: entry.originalStartTime,
        originalEndTime: entry.originalEndTime,
      }),
    };
  }

  return {
    hours: calculatedHours + totalAdjustment,
    totalAdjustment: Number(totalAdjustment.toFixed(2)),
    adjustmentsByDay,
    flaggedDays,
  };
}

module.exports = {
  getAdjustments,
  getAdjustment,
  setAdjustment,
  setTimeAdjustment,
  setFlag,
  getFlags,
  applyAdjustmentsForMonth,
  getDayKeyFromDateString,
  getPayPeriodRange,
};
