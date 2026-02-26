const fetch = require("node-fetch");

const SPOKE_API_BASE = "https://api.getcircuit.com/public/v0.2b";
const SPOKE_API_KEY = process.env.SPOKE_API_KEY;

// Cache configuration - 1 hour default to avoid rate limiting
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const ROUTE_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour for routes
const STOPS_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour for stops

// Unified cache system
const cache = {
  plans: { data: {}, timestamps: {} },
  routes: { data: {}, timestamps: {} },
  stops: { data: {}, timestamps: {} },
  driverHours: { data: {}, timestamps: {} },
};

/**
 * Get cached data if valid, otherwise return null
 * @param {string} cacheType - 'plans', 'routes', 'stops', or 'driverHours'
 * @param {string} key - Cache key
 * @param {number} maxAge - Max age in ms (optional, uses default for cache type)
 * @returns {*} Cached data or null
 */
function getCached(cacheType, key, maxAge = null) {
  const cacheStore = cache[cacheType];
  if (!cacheStore) return null;

  const defaultMaxAge = {
    plans: CACHE_DURATION_MS,
    routes: ROUTE_CACHE_DURATION_MS,
    stops: STOPS_CACHE_DURATION_MS,
    driverHours: CACHE_DURATION_MS,
  };

  const effectiveMaxAge =
    maxAge || defaultMaxAge[cacheType] || CACHE_DURATION_MS;

  if (cacheStore.data[key] && cacheStore.timestamps[key]) {
    const age = Date.now() - cacheStore.timestamps[key];
    if (age < effectiveMaxAge) {
      return cacheStore.data[key];
    }
  }
  return null;
}

/**
 * Set cache data
 * @param {string} cacheType - 'plans', 'routes', 'stops', or 'driverHours'
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 */
function setCache(cacheType, key, data) {
  const cacheStore = cache[cacheType];
  if (!cacheStore) return;

  cacheStore.data[key] = data;
  cacheStore.timestamps[key] = Date.now();
}

/**
 * Clear all caches or a specific cache type
 * @param {string} cacheType - Optional: 'plans', 'routes', 'stops', or 'driverHours'
 */
function clearCache(cacheType = null) {
  if (cacheType && cache[cacheType]) {
    cache[cacheType].data = {};
    cache[cacheType].timestamps = {};
  } else {
    for (const type in cache) {
      cache[type].data = {};
      cache[type].timestamps = {};
    }
  }
}

/**
 * Get cache statistics for debugging
 * @returns {Object} Cache stats
 */
function getCacheStats() {
  const stats = {};
  for (const type in cache) {
    stats[type] = {
      entries: Object.keys(cache[type].data).length,
      oldestEntry:
        Math.min(...Object.values(cache[type].timestamps).filter(Boolean)) ||
        null,
    };
  }
  return stats;
}

// Legacy cache references for backward compatibility
const plansCache = cache.plans;

/**
 * Calculate pay period date range for a given month
 * Pay periods run from 28th of previous month to 27th of current month
 *
 * @param {number} year - Year (e.g., 2026)
 * @param {number} month - Month (1-12) - this is the "pay month" that the period is named after
 * @returns {Object} { startDate: { year, month, day }, endDate: { year, month, day }, label: string }
 *
 * Example: getPayPeriodRange(2026, 2) returns:
 *   startDate: { year: 2026, month: 1, day: 28 }  // Jan 28, 2026
 *   endDate: { year: 2026, month: 2, day: 27 }    // Feb 27, 2026
 */
function getPayPeriodRange(year, month) {
  // Start date: 28th of previous month
  let startYear = year;
  let startMonth = month - 1;
  if (startMonth < 1) {
    startMonth = 12;
    startYear = year - 1;
  }

  // End date: 27th of current month
  const endYear = year;
  const endMonth = month;

  return {
    startDate: { year: startYear, month: startMonth, day: 28 },
    endDate: { year: endYear, month: endMonth, day: 27 },
  };
}

/**
 * Check if a plan date falls within a pay period range
 * @param {Object} planStarts - Plan starts object { year, month, day }
 * @param {Object} startDate - Pay period start { year, month, day }
 * @param {Object} endDate - Pay period end { year, month, day }
 * @returns {boolean}
 */
function isPlanInPayPeriod(planStarts, startDate, endDate) {
  if (!planStarts || !planStarts.year || !planStarts.month || !planStarts.day) {
    return false;
  }

  // Convert to comparable date values (YYYYMMDD as number)
  const planDate =
    planStarts.year * 10000 + planStarts.month * 100 + planStarts.day;
  const start = startDate.year * 10000 + startDate.month * 100 + startDate.day;
  const end = endDate.year * 10000 + endDate.month * 100 + endDate.day;

  return planDate >= start && planDate <= end;
}

/**
 * Get Basic Auth header for Spoke API
 * API key is username, password is empty
 */
function getAuthHeader() {
  if (!SPOKE_API_KEY) {
    throw new Error("SPOKE_API_KEY not configured");
  }
  // Basic auth: base64(apiKey:) - API key as username, empty password
  const credentials = Buffer.from(`${SPOKE_API_KEY}:`).toString("base64");
  return `Basic ${credentials}`;
}

/**
 * List plans with pagination and filtering
 * @param {Object} options - Query options
 * @param {string} options.pageToken - Page token for pagination
 * @param {number} options.maxPageSize - Max results per page (1-20, default 10)
 * @param {Object} options.filter - Filter object (e.g., { title: 'foo' })
 * @returns {Promise<Object>} { plans: [], nextPageToken: string|null }
 */
async function listPlans(options = {}) {
  if (!SPOKE_API_KEY) {
    throw new Error("SPOKE_API_KEY not configured");
  }

  const { pageToken, maxPageSize = 20, filter = {} } = options;

  // Build query string
  const params = new URLSearchParams();
  if (pageToken) params.append("pageToken", pageToken);
  if (maxPageSize) params.append("maxPageSize", maxPageSize.toString());

  // Add filter params
  for (const [key, value] of Object.entries(filter)) {
    params.append(`filter[${key}]`, value);
  }

  const url = `${SPOKE_API_BASE}/plans?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to list plans: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return await response.json();
}

/**
 * Fetch all plans with pagination (handles multiple pages automatically)
 * @param {Object} filter - Filter object
 * @returns {Promise<Array>} Array of all plans matching filter
 */
async function getAllPlans(filter = {}) {
  const allPlans = [];
  let pageToken = null;

  do {
    const response = await listPlans({
      pageToken,
      maxPageSize: 20,
      filter,
    });

    allPlans.push(...response.plans);
    pageToken = response.nextPageToken;
  } while (pageToken);

  return allPlans;
}

/**
 * Get all plans for a specific pay period
 * Pay periods run from 28th of previous month to 27th of current month
 *
 * @param {number} year - Year (e.g., 2026)
 * @param {number} month - Month (1-12) - the "pay month" (e.g., 2 = February pay = Jan 28 - Feb 27)
 * @returns {Promise<Array>} Array of plans that start within the pay period
 */
async function getPlansForMonth(year, month) {
  // Check cache first
  const cacheKey = `${year}-${String(month).padStart(2, "0")}`;

  const cached = getCached("plans", cacheKey);
  if (cached) {
    console.log(`[Cache HIT] Plans for pay period ${cacheKey}`);
    return cached;
  }

  // Calculate pay period date range (28th prev month to 27th current month)
  const { startDate, endDate } = getPayPeriodRange(year, month);
  console.log(
    `[Cache MISS] Fetching plans for pay period ${cacheKey} (${startDate.day}/${startDate.month}/${startDate.year} - ${endDate.day}/${endDate.month}/${endDate.year}) from Spoke API`
  );

  // Fetch all plans (we'll filter by date)
  const allPlans = await getAllPlans();

  // Filter plans that start within the pay period
  const periodPlans = allPlans.filter((plan) => {
    if (!plan.starts) return false;
    return isPlanInPayPeriod(plan.starts, startDate, endDate);
  });

  // Cache the results
  setCache("plans", cacheKey, periodPlans);

  return periodPlans;
}

/**
 * Fetch a single plan by ID
 * @param {string} planId - Plan ID in format "plans/xxx"
 * @returns {Promise<Object>} Plan object with routes array
 */
async function getPlan(planId) {
  if (!SPOKE_API_KEY) {
    throw new Error("SPOKE_API_KEY not configured");
  }

  const url = `${SPOKE_API_BASE}/${planId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch plan ${planId}: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return await response.json();
}

/**
 * Fetch a single route by ID (with caching)
 * @param {string} routeId - Route ID in format "routes/xxx"
 * @returns {Promise<Object>} Route object with driver and state
 */
async function getRoute(routeId) {
  if (!SPOKE_API_KEY) {
    throw new Error("SPOKE_API_KEY not configured");
  }

  // Check cache first
  const cached = getCached("routes", routeId);
  if (cached) {
    return cached;
  }

  const url = `${SPOKE_API_BASE}/${routeId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch route ${routeId}: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();

  // Cache the route
  setCache("routes", routeId, data);

  return data;
}

/**
 * Fetch stops for a plan (with caching)
 * @param {string} planId - Plan ID in format "plans/xxx"
 * @returns {Promise<Object>} { stops: [...] }
 */
async function getStops(planId) {
  if (!SPOKE_API_KEY) {
    throw new Error("SPOKE_API_KEY not configured");
  }

  // Check cache first
  const cacheKey = `stops:${planId}`;
  const cached = getCached("stops", cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${SPOKE_API_BASE}/${planId}/stops`;
  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch stops for ${planId}: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();

  // Cache the stops
  setCache("stops", cacheKey, data);

  return data;
}

/**
 * Get the latest stop delivery time for a plan
 * Used when a route was started but not formally completed
 * @param {string} planId - Plan ID
 * @returns {Promise<number|null>} Latest attemptedAt timestamp in seconds, or null
 */
async function getLatestStopTime(planId) {
  try {
    const stopsData = await getStops(planId);
    if (!stopsData.stops || stopsData.stops.length === 0) {
      return null;
    }

    let latestTime = null;
    for (const stop of stopsData.stops) {
      const attemptedAt = stop.deliveryInfo?.attemptedAt;
      if (attemptedAt && (latestTime === null || attemptedAt > latestTime)) {
        latestTime = attemptedAt;
      }
    }
    return latestTime;
  } catch (error) {
    console.error(`Error fetching stops for ${planId}:`, error.message);
    return null;
  }
}

/**
 * Check if a timestamp (in seconds) is from today
 * @param {number} timestampSeconds - Unix timestamp in seconds
 * @returns {boolean}
 */
function isToday(timestampSeconds) {
  if (!timestampSeconds) return false;
  const date = new Date(timestampSeconds * 1000);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Apply 8:00 AM start time floor for pay calculation
 * If a route starts before 8:00 AM London time, floor it to 8:00 AM
 *
 * @param {number} timestampSeconds - Unix timestamp in seconds
 * @returns {number} Adjusted timestamp (floored to 8 AM if before 8 AM)
 */
function applyStartTimeFloor(timestampSeconds) {
  if (!timestampSeconds) return timestampSeconds;

  // Convert to Date object
  const date = new Date(timestampSeconds * 1000);

  // Format in London timezone to get local hour
  const londonHour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "numeric",
      hour12: false,
    }).format(date),
    10
  );

  const londonMinute = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      minute: "numeric",
    }).format(date),
    10
  );

  // If before 8:00 AM, floor to 8:00 AM
  if (londonHour < 8) {
    // Get the date parts in London timezone
    const londonParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(date)
      .split("/");

    // Parse as DD/MM/YYYY
    const day = parseInt(londonParts[0], 10);
    const month = parseInt(londonParts[1], 10) - 1; // 0-indexed
    const year = parseInt(londonParts[2], 10);

    // Create 8:00 AM in London time
    // We need to account for timezone offset
    const eightAm = new Date(Date.UTC(year, month, day, 8, 0, 0));

    // Get the offset for London at this time (handles DST)
    const londonOffset = getTimezoneOffsetForLondon(year, month, day);
    eightAm.setTime(eightAm.getTime() - londonOffset * 60 * 1000);

    return Math.floor(eightAm.getTime() / 1000);
  }

  return timestampSeconds;
}

/**
 * Get timezone offset for London in minutes (handles DST)
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} day
 * @returns {number} Offset in minutes (positive = ahead of UTC)
 */
function getTimezoneOffsetForLondon(year, month, day) {
  // Create a date at noon on the given day to avoid edge cases
  const testDate = new Date(Date.UTC(year, month, day, 12, 0, 0));

  // Get the formatted hour in London timezone
  const utcHour = 12;
  const londonHour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "numeric",
      hour12: false,
    }).format(testDate),
    10
  );

  // London offset = London hour - UTC hour (in minutes)
  return (londonHour - utcHour) * 60;
}

/**
 * Determine the status of a route
 * @param {Object} route - Route object with state
 * @param {number|null} lastStopTime - Last stop delivery time (for routes without completedAt)
 * @returns {string} 'completed', 'in_progress', 'not_started'
 */
function getRouteStatus(route, lastStopTime = null) {
  if (!route.state) return "not_started";
  if (route.state.completedAt) return "completed";
  if (route.state.startedAt) {
    // Route was started but not formally completed
    // Check if we have stop delivery data to use as effective completion
    if (lastStopTime) {
      return "completed"; // We can calculate hours from last stop
    }
    // Only show as "in_progress" if it started today
    if (isToday(route.state.startedAt)) {
      return "in_progress";
    }
    // Historical route with no stop data - can't calculate hours
    return "not_started";
  }
  return "not_started";
}

/**
 * Calculate hours worked from a route's state
 * @param {Object} route - Route object with state.startedAt and state.completedAt
 * @param {number|null} lastStopTime - Last stop delivery time (for routes without completedAt)
 * @returns {Object} { hours: number|null, effectiveStartedAt: number|null }
 */
function calculateRouteHours(route, lastStopTime = null) {
  const status = getRouteStatus(route, lastStopTime);

  if (status === "not_started") {
    return { hours: null, effectiveStartedAt: null };
  }

  if (status === "in_progress") {
    return { hours: null, effectiveStartedAt: null }; // Route still ongoing today
  }

  const originalStartTime = route.state.startedAt;
  // Apply 8 AM floor to start time for pay calculation
  const startTime = applyStartTimeFloor(originalStartTime);
  // Use completedAt if available, otherwise use last stop delivery time
  const endTime = route.state.completedAt || lastStopTime;

  if (!startTime || !endTime) {
    return { hours: null, effectiveStartedAt: null };
  }

  // Timestamps from Spoke API are in SECONDS (Unix timestamp)
  // Calculate duration in seconds, then convert to hours
  const durationSeconds = endTime - startTime;
  const hours = durationSeconds / 3600;

  return {
    hours: Math.max(0, hours), // Ensure non-negative
    effectiveStartedAt: startTime,
  };
}

/**
 * Process items in batches with concurrency limit to avoid rate limiting
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {number} batchSize - Number of concurrent requests (default: 5)
 * @param {number} delayMs - Delay between batches in ms (default: 100)
 * @returns {Promise<Array>} Results from all processors
 */
async function processBatched(items, processor, batchSize = 5, delayMs = 100) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Add delay between batches to avoid rate limiting (except after last batch)
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Fetch all routes for a plan and calculate driver hours
 * @param {Object|string} plan - Plan object or Plan ID string
 * @returns {Promise<Array>} Array of { routeId, driverId, hours, startedAt, completedAt, planDate }
 */
async function getPlanDriverHours(plan) {
  // If plan is a string (ID), fetch it; otherwise use the provided plan object
  const planObj = typeof plan === "string" ? await getPlan(plan) : plan;

  if (!planObj.routes || planObj.routes.length === 0) {
    return [];
  }

  // Fetch routes with batching to avoid rate limiting
  // Use smaller batches (5 concurrent) with delays between batches
  const routes = await processBatched(
    planObj.routes,
    (routeId) => getRoute(routeId),
    5, // 5 concurrent requests
    100 // 100ms delay between batches
  );

  // For routes that were started but not formally completed, fetch stop times
  // to calculate hours based on last delivery
  let lastStopTime = null;
  const needsStopData = routes.some(
    (route) =>
      route.state?.startedAt &&
      !route.state?.completedAt &&
      !isToday(route.state.startedAt)
  );

  if (needsStopData) {
    lastStopTime = await getLatestStopTime(planObj.id);
  }

  // Calculate hours for each route
  return routes
    .map((route) => {
      // Only use lastStopTime for routes that need it (started but not completed, not today)
      const routeNeedsStopTime =
        route.state?.startedAt &&
        !route.state?.completedAt &&
        !isToday(route.state.startedAt);
      const effectiveLastStopTime = routeNeedsStopTime ? lastStopTime : null;

      const { hours, effectiveStartedAt } = calculateRouteHours(route, effectiveLastStopTime);
      const status = getRouteStatus(route, effectiveLastStopTime);
      return {
        routeId: route.id,
        driverId: route.driver,
        hours: hours !== null ? parseFloat(hours.toFixed(2)) : null,
        status, // 'completed', 'in_progress', 'not_started'
        startedAt: route.state?.startedAt || null, // Original start time (for display)
        effectiveStartedAt: effectiveStartedAt, // Floored to 8 AM (for calculation)
        completedAt: route.state?.completedAt || effectiveLastStopTime || null,
        planDate: planObj.starts, // { day, month, year }
        planId: planObj.id,
        routeTitle: route.title,
      };
    })
    .filter((r) => r.driverId); // Only include routes with assigned drivers
}

/**
 * Get all driver hours for a list of plans
 * @param {Array<Object|string>} plans - Array of plan objects or plan IDs
 * @returns {Promise<Object>} Object mapping driverId to { hours, details }
 */
async function getDriverHoursFromPlans(plans) {
  console.log(`[Processing] ${plans.length} plans for driver hours...`);

  // Process plans in batches to avoid overwhelming the API
  // Use larger batches (3 plans at a time) since each plan fetches multiple routes
  const allPlanHours = await processBatched(
    plans,
    (plan) => getPlanDriverHours(plan),
    3, // 3 plans at a time
    200 // 200ms delay between batches
  );

  // Flatten array of arrays
  const allRouteHours = allPlanHours.flat();
  console.log(`[Processed] ${allRouteHours.length} total routes`);

  // Group by driver ID
  const driverHours = {};

  for (const routeData of allRouteHours) {
    const driverId = routeData.driverId;

    if (!driverHours[driverId]) {
      driverHours[driverId] = {
        totalHours: 0,
        details: [],
      };
    }

    // Only add completed hours to total (not in-progress routes)
    if (routeData.hours !== null) {
      driverHours[driverId].totalHours += routeData.hours;
    }

    // Determine route date
    let routeDate = null;
    if (routeData.startedAt && routeData.startedAt > 0) {
      // Spoke API returns timestamps in seconds, multiply by 1000 for JavaScript Date
      routeDate = new Date(routeData.startedAt * 1000).toISOString();
    } else if (routeData.planDate) {
      // Fallback to plan date if no startedAt timestamp
      const { year, month, day } = routeData.planDate;
      routeDate = new Date(year, month - 1, day).toISOString();
    }

    driverHours[driverId].details.push({
      id: routeData.routeId,
      planId: routeData.planId,
      date: routeDate,
      hours: routeData.hours, // null for in-progress routes
      status: routeData.status, // 'completed', 'in_progress', 'not_started'
      startedAt: routeData.startedAt, // Unix timestamp in seconds (original)
      effectiveStartedAt: routeData.effectiveStartedAt, // Unix timestamp in seconds (floored to 8 AM)
      completedAt: routeData.completedAt, // Unix timestamp in seconds
      routeTitle: routeData.routeTitle,
      planDate: routeData.planDate,
    });
  }

  // Round total hours
  for (const driverId in driverHours) {
    driverHours[driverId].totalHours = parseFloat(
      driverHours[driverId].totalHours.toFixed(2)
    );
  }

  return driverHours;
}

/**
 * Get all driver hours for a specific month
 * @param {number} year - Year (e.g., 2026)
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Object mapping driverId to { totalHours, details }
 */
async function getDriverHoursForMonth(year, month) {
  // Check cache for the complete driver hours result
  const cacheKey = `driverHours:${year}-${String(month).padStart(2, "0")}`;
  const cached = getCached("driverHours", cacheKey);
  if (cached) {
    console.log(
      `[Cache HIT] Driver hours for ${year}-${String(month).padStart(2, "0")}`
    );
    return cached;
  }

  console.log(
    `[Cache MISS] Computing driver hours for ${year}-${String(month).padStart(
      2,
      "0"
    )}`
  );

  const plans = await getPlansForMonth(year, month);

  if (plans.length === 0) {
    setCache("driverHours", cacheKey, {});
    return {};
  }

  const result = await getDriverHoursFromPlans(plans);

  // Cache the complete result
  setCache("driverHours", cacheKey, result);

  return result;
}

module.exports = {
  listPlans,
  getAllPlans,
  getPlansForMonth,
  getPlan,
  getRoute,
  getStops,
  getLatestStopTime,
  calculateRouteHours,
  getPlanDriverHours,
  getDriverHoursFromPlans,
  getDriverHoursForMonth,
  getPayPeriodRange,
  // Cache utilities
  clearCache,
  getCacheStats,
};
