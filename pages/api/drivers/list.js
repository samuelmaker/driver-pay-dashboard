export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Load pins from env to get list of driver usernames
  const pinStoreJson = process.env.PIN_STORE_JSON || '{}';
  let pins = {};
  try {
    pins = JSON.parse(pinStoreJson);
  } catch (e) {
    console.error('Failed to parse PIN_STORE_JSON:', e.message);
    console.error('PIN_STORE_JSON value:', pinStoreJson);
    return res.status(500).json({ error: 'invalid PIN_STORE_JSON', details: e.message });
  }

  const driverNames = Object.keys(pins).sort();
  return res.json({ drivers: driverNames });
}
