const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createSession, requireAuth } = require('../lib/session');
const secret = 'test-only-signing-key-with-at-least-32-bytes';
const originalSecret = process.env.JWT_SECRET;
afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});
const request = token => ({ headers: { cookie: `soda_session=${token}` } });

test('missing or weak configuration cannot mint or verify sessions', () => {
  for (const value of ['', 'dev-secret', 'short']) {
    process.env.JWT_SECRET = value;
    assert.throws(() => createSession('admin'));
    assert.equal(requireAuth(request(jwt.sign({ username: 'admin' }, 'dev-secret'))), null);
  }
});

test('a valid session survives other cookies and identifies its user', () => {
  process.env.JWT_SECRET = secret;
  const token = createSession('samuel');
  assert.equal(requireAuth({ headers: { cookie: `theme=dark; soda_session=${token}` } }).username, 'samuel');
  assert.equal(requireAuth({ headers: { cookie: `fake_soda_session=${token}` } }), null);
});

test('expired, forged, wrong-algorithm and incomplete claims are rejected', () => {
  process.env.JWT_SECRET = secret;
  const tokens = [
    jwt.sign({ username: 'admin' }, 'attacker-key', { expiresIn: '1h' }),
    jwt.sign({ username: 'admin' }, secret, { expiresIn: -1 }),
    jwt.sign({ username: 'admin' }, secret, { algorithm: 'HS512', expiresIn: '1h' }),
    jwt.sign({ username: 'admin' }, secret),
    jwt.sign({ username: {} }, secret, { expiresIn: '1h' }),
    'malformed'
  ];
  for (const token of tokens) assert.equal(requireAuth(request(token)), null);
});
