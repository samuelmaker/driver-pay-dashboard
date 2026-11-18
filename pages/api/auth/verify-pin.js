const { createHash, timingSafeEqual } = require('crypto');
const { createSession, getSessionSecret } = require('../../../lib/session');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, pin } = req.body || {};
  if (typeof username !== 'string' || typeof pin !== 'string' || !username || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: 'username and six-digit pin required' });
  }
  try { getSessionSecret(); } catch {
    return res.status(503).json({ error: 'Authentication is not configured' });
  }

  // Load pins from env (server-only)
  const pinStoreJson = process.env.PIN_STORE_JSON || '{}';
  let pins = {};
  try { pins = JSON.parse(pinStoreJson); } catch (e) { return res.status(500).json({ error: 'invalid PIN_STORE_JSON' }); }

  const expected = pins && Object.hasOwn(pins, username) ? pins[username] : null;
  const digest = value => createHash('sha256').update(value).digest();
  if (typeof expected !== 'string' || !timingSafeEqual(digest(expected), digest(pin))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // issue JWT (short TTL)
  const token = createSession(username);

  // Build secure cookie string
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieParts = [
    `soda_session=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${8 * 3600}`,
    'SameSite=Strict'
  ];

  // Add Secure flag in production (HTTPS only)
  if (isProduction) {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return res.json({ ok: true });
}
