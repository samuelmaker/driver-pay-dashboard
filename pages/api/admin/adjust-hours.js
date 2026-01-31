import { verify } from 'jsonwebtoken';
const { isAdmin } = require('../../../lib/driver-mapping');
const { setAdjustment } = require('../../../lib/adjustments');

function requireAuth(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/soda_session=([^;]+)/);
  if (!match) return null;
  try { return verify(match[1], process.env.JWT_SECRET || 'dev-secret'); } catch (e) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = requireAuth(req);
  if (!session) return res.status(401).json({ error: 'not authenticated' });

  // Check if user is admin
  if (!isAdmin(session.username)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { username, dayKey, adjustment, reason } = req.body;

  if (!username || !dayKey || adjustment === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: username, dayKey, adjustment'
    });
  }

  try {
    const success = setAdjustment(username, dayKey, parseFloat(adjustment), reason || '');

    if (success) {
      return res.json({
        success: true,
        message: `Adjustment of ${adjustment} hours set for ${username} on ${dayKey}`
      });
    } else {
      return res.status(500).json({ error: 'Failed to save adjustment' });
    }
  } catch (error) {
    console.error('Error setting adjustment:', error);
    return res.status(500).json({
      error: 'Failed to set adjustment',
      message: error.message
    });
  }
}
