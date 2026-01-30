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
 * Calculate hours worked from a route's state
 * @param {Object} route - Route object with state.startedAt and state.completedAt
 * @returns {number} Hours worked (0 if not started or not completed)
 */
function calculateRouteHours(route) {
  if (!route.state || !route.state.startedAt || !route.state.completedAt) {
    return 0;
  }

  const startTime = route.state.startedAt;
  const endTime = route.state.completedAt;

  if (!startTime || !endTime) {
    return 0;
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

  // Calculate hours for each route
  return routes.map(route => {
    const hours = calculateRouteHours(route);
    return {
      routeId: route.id,
      driverId: route.driver,
      hours: parseFloat(hours.toFixed(2)),
      startedAt: route.state?.startedAt || null,
      completedAt: route.state?.completedAt || null,
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

    driverHours[driverId].totalHours += routeData.hours;
    driverHours[driverId].details.push({
      id: routeData.routeId,
      // Spoke API returns timestamps in seconds, multiply by 1000 for JavaScript Date
      date: routeData.startedAt ? new Date(routeData.startedAt * 1000).toISOString() : null,
      hours: routeData.hours,
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
  calculateRouteHours,
  getPlanDriverHours,
  getDriverHoursFromPlans,
  getDriverHoursForMonth
};
