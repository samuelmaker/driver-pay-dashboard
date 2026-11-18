const { requireAuth } = require('../../../lib/session');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const session = requireAuth(req);
  if (!session) return res.status(401).json({ error: 'not authenticated' });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ username: session.username });
}
