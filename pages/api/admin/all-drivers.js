import { verify } from 'jsonwebtoken';
const { isAdmin, getAllDriverUsernames, getDriverId, getPayRate, getDisplayName } = require('../../../lib/driver-mapping');
const { getDriverHoursForMonth } = require('../../../lib/spoke-api');
const { applyAdjustmentsForMonth } = require('../../../lib/adjustments');

function requireAuth(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/soda_session=([^;]+)/);
  if (!match) return null;
  try { return verify(match[1], process.env.JWT_SECRET || 'dev-secret'); } catch (e) { return null; }
}

export default async function handler(req, res) {
  const session = requireAuth(req);
  if (!session) return res.status(401).json({ error: 'not authenticated' });

  // Check if user is admin
  if (!isAdmin(session.username)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { month } = req.query;
  const targetMonth = month || process.env.DEFAULT_MONTH || new Date().toISOString().slice(0,7);

  try {
    // Parse month into year and month numbers
    const [year, monthNum] = targetMonth.split('-').map(Number);

    // Fetch all driver hours for this month
    const allDriverHours = await getDriverHoursForMonth(year, monthNum);

    // Get all registered drivers
    const allDriverUsernames = getAllDriverUsernames();

    // Build response with all drivers
    const driversData = allDriverUsernames.map(username => {
      const driverId = getDriverId(username);
      const driverData = allDriverHours[driverId] || { totalHours: 0, details: [] };
      const payRate = getPayRate(username);

      // Apply any manual adjustments
      const adjusted = applyAdjustmentsForMonth(username, targetMonth, driverData.totalHours, driverData.details);

      const pay = parseFloat((adjusted.hours * payRate).toFixed(2));
      const reasons = Object.values(adjusted.adjustmentsByDay || {})
        .map(a => a.reason)
        .filter(r => !!r);
      const reasonSummary = reasons.length > 1 ? 'Multiple adjustments' : (reasons[0] || '');

      return {
        username,
        displayName: getDisplayName(username),
        driverId,
        hours: adjusted.hours,
        calculatedHours: driverData.totalHours,
        adjustment: adjusted.totalAdjustment,
        adjustmentReason: reasonSummary,
        adjustmentsByDay: adjusted.adjustmentsByDay || {},
        rate: payRate,
        pay,
        routeCount: driverData.details.length,
        routes: driverData.details
      };
    });

    // Sort by display name
    driversData.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return res.json({
      month: targetMonth,
      drivers: driversData,
      totalDrivers: driversData.length,
      totalHours: driversData.reduce((sum, d) => sum + d.hours, 0),
      totalPay: driversData.reduce((sum, d) => sum + d.pay, 0)
    });

  } catch (error) {
    console.error('Error fetching all drivers data:', error);
    return res.status(500).json({
      error: 'Failed to fetch drivers data',
      message: error.message
    });
  }
}
