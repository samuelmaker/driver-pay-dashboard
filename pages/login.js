import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const [drivers, setDrivers] = useState([]);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load list of drivers
    fetch('/api/drivers/list')
      .then(r => r.json())
      .then(data => setDrivers(data.drivers || []))
      .catch(() => setMsg('Failed to load drivers'));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const res = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin })
    });
    const j = await res.json();

    setLoading(false);

    if (res.ok) {
      router.push('/dashboard');
    } else {
      setMsg(j.error || 'Login failed');
    }
  }

  return (
    <div style={{
      maxWidth: 500,
      margin: '4rem auto',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>Driver Pay Dashboard</h1>

      <form onSubmit={submit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#555' }}>
            Select Your Name
          </label>
          <select
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#fff'
            }}
            required
          >
            <option value="">-- Choose driver --</option>
            {drivers.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#555' }}>
            Enter Your 6-Digit PIN
          </label>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength="6"
            pattern="\d{6}"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              letterSpacing: '0.3rem',
              textAlign: 'center'
            }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !username || pin.length !== 6}
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#fff',
            backgroundColor: loading || !username || pin.length !== 6 ? '#ccc' : '#007bff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !username || pin.length !== 6 ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {msg && (
        <p style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          {msg}
        </p>
      )}
    </div>
  );
}
