export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Clear the session cookie with same attributes as login
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieParts = [
    'soda_session=',
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Strict'
  ];

  if (isProduction) {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return res.json({ ok: true });
}
