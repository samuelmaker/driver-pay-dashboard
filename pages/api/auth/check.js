import { verify } from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const cookie = req.headers.cookie || '';
  const match = cookie.match(/soda_session=([^;]+)/);

  if (!match) {
    return res.status(401).json({ error: 'not authenticated' });
  }

  try {
    const session = verify(match[1], process.env.JWT_SECRET || 'dev-secret');
    return res.json({ username: session.username });
  } catch (e) {
    return res.status(401).json({ error: 'invalid session' });
  }
}
