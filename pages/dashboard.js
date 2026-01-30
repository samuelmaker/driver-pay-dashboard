import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [driverId, setDriverId] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  async function load() {
    setErr(null);
    const res = await fetch(`/api/driver?driverId=${encodeURIComponent(driverId)}`);
    const j = await res.json();
    if (res.ok) setData(j); else setErr(j.error || 'error');
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>Driver Dashboard</h1>
      <p>Enter Spoke driverId to view month-to-date pay.</p>
      <input value={driverId} onChange={e=>setDriverId(e.target.value)} placeholder="driverId (from Spoke)" />
      <button onClick={load}>Load</button>

      {err && <p style={{ color: 'red' }}>{err}</p>}
      {data && (
        <div>
          <h2>{data.month} — £{data.pay} ({data.hours} hours @ £{data.rate}/hr)</h2>
          <h3>Details</h3>
          <ul>
            {data.details.map(d=> (
              <li key={d.id}>{d.date} — {d.hours}h</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
