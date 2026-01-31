import { verify } from 'jsonwebtoken';
const { getDriverId, getPayRate } = require('../../lib/driver-mapping');
const { getDriverHoursForMonth } = require('../../lib/spoke-api');
const { applyAdjustment } = require('../../lib/adjustments');

function requireAuth(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/soda_session=([^;]+)/);
  if (!match) return null;
  try { return verify(match[1], process.env.JWT_SECRET || 'dev-secret'); } catch (e) { return null; }
}

export default async function handler(req, res) {
  const session = requireAuth(req);
  if (!session) return res.status(401).json({ error: 'not authenticated' });

  // Get driver ID from session username
  const driverId = getDriverId(session.username);
  if (!driverId) {
    return res.status(400).json({ error: `Driver ID not found for user: ${session.username}. Please contact administrator.` });
  }

  const { month } = req.query;
  const targetMonth = month || process.env.DEFAULT_MONTH || new Date().toISOString().slice(0,7);

  try {
    // Parse month into year and month numbers
    const [year, monthNum] = targetMonth.split('-').map(Number);

    // Fetch all driver hours for this month (automatically fetches plans from Spoke)
    const allDriverHours = await getDriverHoursForMonth(year, monthNum);

    // Get data for this specific driver
    const driverData = allDriverHours[driverId] || { totalHours: 0, details: [] };

    // Get driver's pay rate
    const payRate = getPayRate(session.username);

    // Apply any manual adjustments from admin
    const adjusted = applyAdjustment(session.username, targetMonth, driverData.totalHours);

    const hours = adjusted.hours;
    const pay = parseFloat((hours * payRate).toFixed(2));

    // Sort details by date (most recent first)
    const sortedDetails = driverData.details.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return res.json({
      month: targetMonth,
      driverId,
      username: session.username,
      hours,
      calculatedHours: driverData.totalHours,
      adjustment: adjusted.adjustment,
      adjustmentReason: adjusted.reason,
      rate: payRate,
      pay,
      details: sortedDetails,
      planCount: Object.keys(allDriverHours).length > 0 ? 'auto' : 0
    });

  } catch (error) {
    console.error('Error fetching driver pay data:', error);
    return res.status(500).json({
      error: 'Failed to fetch pay data',
      message: error.message
    });
  }
}
