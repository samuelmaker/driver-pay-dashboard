import fetch from 'node-fetch';
import { verify } from 'jsonwebtoken';

const PAY_RATE = parseFloat(process.env.PAY_RATE || '15');
const SPOKE_API_KEY = process.env.SPOKE_API_KEY;

function requireAuth(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/soda_session=([^;]+)/);
  if (!match) return null;
  try { return verify(match[1], process.env.JWT_SECRET || 'dev-secret'); } catch (e) { return null; }
}

export default async function handler(req, res) {
  const session = requireAuth(req);
  if (!session) return res.status(401).json({ error: 'not authenticated' });

  const { driverId, month } = req.query;
  if (!driverId) return res.status(400).json({ error: 'driverId required' });

  const targetMonth = month || process.env.DEFAULT_MONTH || new Date().toISOString().slice(0,7);
  const from = `${targetMonth}-01T00:00:00Z`;
  // naive end: next month 1st
  const [y,m] = targetMonth.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(y, m, 1)).toISOString().slice(0,10) + 'T00:00:00Z';

  // Call Spoke API to get routes/shifts for driver within month
  // NOTE: exact endpoint may differ; adjust after reviewing docs. Using placeholder /drivers/{id}/routes
  if (!SPOKE_API_KEY) return res.status(500).json({ error: 'SPOKE_API_KEY not configured' });

  const url = `https://api.dispatch.spoke.com/drivers/${driverId}/routes?from=${from}&to=${nextMonth}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${SPOKE_API_KEY}` } });
  if (!r.ok) return res.status(502).json({ error: 'spoke api error', status: r.status });
  const data = await r.json();

  // Expect data.routes array with duration_seconds or start/end times
  let totalSeconds = 0;
  const details = (data.routes || []).map(rt => {
    const seconds = rt.duration_seconds || (rt.end && rt.start ? (new Date(rt.end).getTime() - new Date(rt.start).getTime())/1000 : 0);
    totalSeconds += seconds;
    return {
      id: rt.id,
      date: rt.start,
      hours: +(seconds/3600).toFixed(2),
      raw: rt
    };
  });

  const hours = +(totalSeconds/3600).toFixed(2);
  const pay = +(hours * PAY_RATE).toFixed(2);

  return res.json({ month: targetMonth, driverId, hours, rate: PAY_RATE, pay, details });
}
