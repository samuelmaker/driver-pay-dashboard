const fetch = require('node-fetch');

const SPOKE_API_BASE = 'https://api.getcircuit.com/public/v0.2b';
const SPOKE_API_KEY = process.env.SPOKE_API_KEY;

// Simple in-memory cache for plans (cache for 5 minutes)
const plansCache = {
  data: {},
  timestamps: {}
};
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get Basic Auth header for Spoke API
 * API key is username, password is empty
 */
function getAuthHeader() {
  if (!SPOKE_API_KEY) {
    throw new Error('SPOKE_API_KEY not configured');
  }
  // Basic auth: base64(apiKey:) - API key as username, empty password
  const credentials = Buffer.from(`${SPOKE_API_KEY}:`).toString('base64');
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
    throw new Error('SPOKE_API_KEY not configured');
  }

  const { pageToken, maxPageSize = 20, filter = {} } = options;

  // Build query string
  const params = new URLSearchParams();
  if (pageToken) params.append('pageToken', pageToken);
  if (maxPageSize) params.append('maxPageSize', maxPageSize.toString());

  // Add filter params
  for (const [key, value] of Object.entries(filter)) {
    params.append(`filter[${key}]`, value);
  }

  const url = `${SPOKE_API_BASE}/plans?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list plans: ${response.status} ${response.statusText} - ${errorText}`);
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
      filter
    });

    allPlans.push(...response.plans);
    pageToken = response.nextPageToken;
  } while (pageToken);

  return allPlans;
}

/**
 * Get all plans for a specific month
 * @param {number} year - Year (e.g., 2026)
 * @param {number} month - Month (1-12)
 * @returns {Promise<Array>} Array of plans that start in that month
 */
async function getPlansForMonth(year, month) {
  // Check cache first
  const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
  const now = Date.now();

  if (plansCache.data[cacheKey] && plansCache.timestamps[cacheKey]) {
    const age = now - plansCache.timestamps[cacheKey];
    if (age < CACHE_DURATION_MS) {
      console.log(`Using cached plans for ${cacheKey}`);
      return plansCache.data[cacheKey];
    }
  }

  console.log(`Fetching plans for ${cacheKey} from Spoke API`);

  // Fetch all plans (we'll filter by date)
  const allPlans = await getAllPlans();

  // Filter plans that start in the specified month
  const monthPlans = allPlans.filter(plan => {
    if (!plan.starts) return false;
    return plan.starts.year === year && plan.starts.month === month;
  });

  // Cache the results
  plansCache.data[cacheKey] = monthPlans;
  plansCache.timestamps[cacheKey] = now;

  return monthPlans;
}

/**
 * Fetch a single plan by ID
 * @param {string} planId - Plan ID in format "plans/xxx"
 * @returns {Promise<Object>} Plan object with routes array
 */
async function getPlan(planId) {
  if (!SPOKE_API_KEY) {
    throw new Error('SPOKE_API_KEY not configured');
  }

  const url = `${SPOKE_API_BASE}/${planId}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch plan ${planId}: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Fetch a single route by ID
 * @param {string} routeId - Route ID in format "routes/xxx"
 * @returns {Promise<Object>} Route object with driver and state
 */
async function getRoute(routeId) {
  if (!SPOKE_API_KEY) {
    throw new Error('SPOKE_API_KEY not configured');
  }

  const url = `${SPOKE_API_BASE}/${routeId}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch route ${routeId}: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Fetch stops for a plan
 * @param {string} planId - Plan ID in format "plans/xxx"
 * @returns {Promise<Object>} { stops: [...] }
 */
async function getStops(planId) {
  if (!SPOKE_API_KEY) {
    throw new Error('SPOKE_API_KEY not configured');
  }

  const url = `${SPOKE_API_BASE}/${planId}/stops`;
  const response = await fetch(url, {
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch stops for ${planId}: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
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
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
}

/**
 * Determine the status of a route
 * @param {Object} route - Route object with state
 * @param {number|null} lastStopTime - Last stop delivery time (for routes without completedAt)
 * @returns {string} 'completed', 'in_progress', 'not_started'
 */
function getRouteStatus(route, lastStopTime = null) {
  if (!route.state) return 'not_started';
  if (route.state.completedAt) return 'completed';
  if (route.state.startedAt) {
    // Route was started but not formally completed
    // Check if we have stop delivery data to use as effective completion
    if (lastStopTime) {
      return 'completed'; // We can calculate hours from last stop
    }
    // Only show as "in_progress" if it started today
    if (isToday(route.state.startedAt)) {
      return 'in_progress';
    }
    // Historical route with no stop data - can't calculate hours
    return 'not_started';
  }
  return 'not_started';
}

/**
 * Calculate hours worked from a route's state
 * @param {Object} route - Route object with state.startedAt and state.completedAt
 * @param {number|null} lastStopTime - Last stop delivery time (for routes without completedAt)
 * @returns {number|null} Hours worked, or null if route is in progress/not started
 */
function calculateRouteHours(route, lastStopTime = null) {
  const status = getRouteStatus(route, lastStopTime);

  if (status === 'not_started') {
    return null;
  }

  if (status === 'in_progress') {
    return null; // Route still ongoing today
  }

  const startTime = route.state.startedAt;
  // Use completedAt if available, otherwise use last stop delivery time
  const endTime = route.state.completedAt || lastStopTime;

  if (!startTime || !endTime) {
    return null;
  }

  // Timestamps from Spoke API are in SECONDS (Unix timestamp)
  // Calculate duration in seconds, then convert to hours
  const durationSeconds = endTime - startTime;
  const hours = durationSeconds / 3600;

  return Math.max(0, hours); // Ensure non-negative
}

/**
 * Fetch all routes for a plan and calculate driver hours
 * @param {Object|string} plan - Plan object or Plan ID string
 * @returns {Promise<Array>} Array of { routeId, driverId, hours, startedAt, completedAt, planDate }
 */
async function getPlanDriverHours(plan) {
  // If plan is a string (ID), fetch it; otherwise use the provided plan object
  const planObj = typeof plan === 'string' ? await getPlan(plan) : plan;

  if (!planObj.routes || planObj.routes.length === 0) {
    return [];
  }

  // Fetch all routes in parallel
  const routePromises = planObj.routes.map(routeId => getRoute(routeId));
  const routes = await Promise.all(routePromises);

  // For routes that were started but not formally completed, fetch stop times
  // to calculate hours based on last delivery
  let lastStopTime = null;
  const needsStopData = routes.some(route =>
    route.state?.startedAt && !route.state?.completedAt && !isToday(route.state.startedAt)
  );

  if (needsStopData) {
    lastStopTime = await getLatestStopTime(planObj.id);
  }

  // Calculate hours for each route
  return routes.map(route => {
    // Only use lastStopTime for routes that need it (started but not completed, not today)
    const routeNeedsStopTime = route.state?.startedAt && !route.state?.completedAt && !isToday(route.state.startedAt);
    const effectiveLastStopTime = routeNeedsStopTime ? lastStopTime : null;

    const hours = calculateRouteHours(route, effectiveLastStopTime);
    const status = getRouteStatus(route, effectiveLastStopTime);
    return {
      routeId: route.id,
      driverId: route.driver,
      hours: hours !== null ? parseFloat(hours.toFixed(2)) : null,
      status, // 'completed', 'in_progress', 'not_started'
      startedAt: route.state?.startedAt || null,
      completedAt: route.state?.completedAt || effectiveLastStopTime || null,
      planDate: planObj.starts, // { day, month, year }
      planId: planObj.id,
      routeTitle: route.title
    };
  }).filter(r => r.driverId); // Only include routes with assigned drivers
}

/**
 * Get all driver hours for a list of plans
 * @param {Array<Object|string>} plans - Array of plan objects or plan IDs
 * @returns {Promise<Object>} Object mapping driverId to { hours, details }
 */
async function getDriverHoursFromPlans(plans) {
  // Fetch hours from all plans in parallel
  const allPlanHoursPromises = plans.map(plan => getPlanDriverHours(plan));
  const allPlanHours = await Promise.all(allPlanHoursPromises);

  // Flatten array of arrays
  const allRouteHours = allPlanHours.flat();

  // Group by driver ID
  const driverHours = {};

  for (const routeData of allRouteHours) {
    const driverId = routeData.driverId;

    if (!driverHours[driverId]) {
      driverHours[driverId] = {
        totalHours: 0,
        details: []
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
      startedAt: routeData.startedAt, // Unix timestamp in seconds
      completedAt: routeData.completedAt, // Unix timestamp in seconds
      routeTitle: routeData.routeTitle,
      planDate: routeData.planDate
    });
  }

  // Round total hours
  for (const driverId in driverHours) {
    driverHours[driverId].totalHours = parseFloat(driverHours[driverId].totalHours.toFixed(2));
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
  const plans = await getPlansForMonth(year, month);

  if (plans.length === 0) {
    return {};
  }

  return await getDriverHoursFromPlans(plans);
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
  getDriverHoursForMonth
};
