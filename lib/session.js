const { sign, verify } = require('jsonwebtoken');

function getSessionSecret() {
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32 || secret === 'dev-secret') {
    throw new Error('JWT_SECRET must contain at least 32 bytes');
  }
  return secret;
}

function createSession(username) {
  return sign({ username }, getSessionSecret(), { algorithm: 'HS256', expiresIn: '8h' });
}

function requireAuth(req) {
  const cookie = req.headers.cookie;
  if (typeof cookie !== 'string') return null;
  const match = cookie.match(/(?:^|;\s*)soda_session=([^;]+)/);
  if (!match) return null;
  try {
    const session = verify(match[1], getSessionSecret(), { algorithms: ['HS256'] });
    if (typeof session !== 'object' || typeof session.username !== 'string' ||
        !session.username || !Number.isFinite(session.exp)) return null;
    return session;
  } catch {
    return null;
  }
}

module.exports = { createSession, getSessionSecret, requireAuth };
