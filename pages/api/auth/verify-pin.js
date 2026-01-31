import { sign } from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, pin } = req.body || {};
  if (!username || !pin) return res.status(400).json({ error: 'username and pin required' });

  // Load pins from env (server-only)
  const pinStoreJson = process.env.PIN_STORE_JSON || '{}';
  let pins = {};
  try { pins = JSON.parse(pinStoreJson); } catch (e) { return res.status(500).json({ error: 'invalid PIN_STORE_JSON' }); }

  const expected = pins[username];
  if (!expected) return res.status(401).json({ error: 'unknown user' });
  if (expected !== pin) return res.status(401).json({ error: 'invalid pin' });

  // issue JWT (short TTL)
  const token = sign({ username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });

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
