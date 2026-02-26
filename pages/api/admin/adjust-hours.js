import { verify } from 'jsonwebtoken';
const { isAdmin } = require('../../../lib/driver-mapping');
const { setAdjustment, setTimeAdjustment, setFlag } = require('../../../lib/adjustments');

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

  const {
    username,
    dayKey,
    // Legacy hour adjustment
    adjustment,
    reason,
    // Time-based adjustment
    adjustedStartTime,
    adjustedEndTime,
    originalStartTime,
    originalEndTime,
    // Flag
    flagged,
    flagReason,
    // Action type to distinguish operations
    actionType,
  } = req.body;

  if (!username || !dayKey) {
    return res.status(400).json({
      error: 'Missing required fields: username, dayKey'
    });
  }

  try {
    let success = false;
    let message = '';

    // Handle flag-only update
    if (actionType === 'flag') {
      success = setFlag(username, dayKey, !!flagged, flagReason || null);
      message = flagged
        ? `Day ${dayKey} flagged for ${username}`
        : `Flag removed for ${username} on ${dayKey}`;
    }
    // Handle time-based adjustment
    else if (actionType === 'time' || (adjustedStartTime !== undefined || adjustedEndTime !== undefined)) {
      success = setTimeAdjustment(
        username,
        dayKey,
        adjustedStartTime ?? null,
        adjustedEndTime ?? null,
        originalStartTime ?? null,
        originalEndTime ?? null,
        reason || ''
      );
      message = `Time adjustment set for ${username} on ${dayKey}`;

      // Also handle flag if provided
      if (flagged !== undefined) {
        setFlag(username, dayKey, !!flagged, flagReason || null);
      }
    }
    // Handle legacy hour adjustment
    else if (adjustment !== undefined) {
      success = setAdjustment(username, dayKey, parseFloat(adjustment), reason || '');
      message = `Adjustment of ${adjustment} hours set for ${username} on ${dayKey}`;

      // Also handle flag if provided
      if (flagged !== undefined) {
        setFlag(username, dayKey, !!flagged, flagReason || null);
      }
    }
    else {
      return res.status(400).json({
        error: 'Missing adjustment data: provide adjustment, time fields, or flag'
      });
    }

    if (success) {
      return res.json({ success: true, message });
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
