export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Clear the session cookie
  res.setHeader('Set-Cookie', 'soda_session=; HttpOnly; Path=/; Max-Age=0');
  return res.json({ ok: true });
}
