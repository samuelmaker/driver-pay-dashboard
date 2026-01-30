import { useState } from 'react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const res = await fetch('/api/auth/verify-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, pin }) });
    const j = await res.json();
    if (res.ok) {
      setMsg('Logged in — go to /dashboard');
    } else setMsg(j.error || 'error');
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>Driver login</h1>
      <form onSubmit={submit}>
        <label>Driver name (username)<br/>
          <input value={username} onChange={e=>setUsername(e.target.value)} /></label>
        <br/>
        <label>PIN<br/>
          <input value={pin} onChange={e=>setPin(e.target.value)} /></label>
        <br/>
        <button>Login</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
