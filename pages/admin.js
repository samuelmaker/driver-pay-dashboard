import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [adjustmentHours, setAdjustmentHours] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  useEffect(() => {
    // Check authentication
    const checkAuthAndLoad = async () => {
      const res = await fetch('/api/auth/check');
      if (res.ok) {
        const authData = await res.json();
        setUsername(authData.username);
        // Auto-load all drivers data
        loadAllDrivers();
      } else {
        router.push('/login');
      }
    };
    checkAuthAndLoad();
  }, [router]);

  async function loadAllDrivers() {
    setErr(null);
    setLoading(true);
    const res = await fetch('/api/admin/all-drivers');
    const j = await res.json();
    setLoading(false);
    if (res.ok) setData(j); else setErr(j.error || 'error');
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function submitAdjustment() {
    if (!selectedDriver || adjustmentHours === '') return;

    const res = await fetch('/api/admin/adjust-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: selectedDriver.username,
        month: data.month,
        adjustment: parseFloat(adjustmentHours),
        reason: adjustmentReason
      })
    });

    if (res.ok) {
      // Reload data
      setSelectedDriver(null);
      setAdjustmentHours('');
      setAdjustmentReason('');
      loadAllDrivers();
    } else {
      const error = await res.json();
      alert('Error: ' + error.error);
    }
  }

  if (!username) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{
      maxWidth: 1200,
      margin: '2rem auto',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>Admin Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Welcome, {username}</p>
        </div>
        <button
          onClick={logout}
          style={{
            padding: '0.5rem 1.5rem',
            fontSize: '0.9rem',
            color: '#666',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {loading && !data && (
        <div style={{
          backgroundColor: '#f0f8ff',
          padding: '2rem',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <p style={{ fontSize: '1.2rem', color: '#007bff', margin: 0 }}>Loading driver data...</p>
        </div>
      )}

      {err && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '4px',
          marginBottom: '2rem'
        }}>
          {err}
        </div>
      )}

      {data && (
        <div>
          <div style={{
            backgroundColor: '#f0f8ff',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '2px solid #007bff'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#007bff' }}>
              Summary - {data.month}
            </h2>
            <div style={{ display: 'flex', gap: '2rem', fontSize: '1.1rem' }}>
              <div><strong>Total Drivers:</strong> {data.totalDrivers}</div>
              <div><strong>Total Hours:</strong> {data.totalHours.toFixed(2)}</div>
              <div><strong>Total Pay:</strong> £{data.totalPay.toFixed(2)}</div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#fff',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0 }}>All Drivers</h3>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Driver</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Hours</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Adjustment</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Rate</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Pay</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Routes</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.drivers.map((driver, idx) => (
                  <tr key={driver.username} style={{
                    backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9'
                  }}>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                      <strong>{driver.displayName}</strong>
                      <br />
                      <small style={{ color: '#666' }}>@{driver.username}</small>
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                      {driver.hours.toFixed(2)}
                      {driver.calculatedHours !== driver.hours && (
                        <small style={{ display: 'block', color: '#666' }}>
                          (calc: {driver.calculatedHours.toFixed(2)})
                        </small>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                      {driver.adjustment !== 0 ? (
                        <span style={{ color: driver.adjustment > 0 ? '#28a745' : '#dc3545' }}>
                          {driver.adjustment > 0 ? '+' : ''}{driver.adjustment.toFixed(2)}
                          {driver.adjustmentReason && (
                            <small style={{ display: 'block', color: '#666' }}>
                              {driver.adjustmentReason}
                            </small>
                          )}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                      £{driver.rate}/hr
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                      <strong>£{driver.pay.toFixed(2)}</strong>
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                      {driver.routeCount}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                      <button
                        onClick={() => setSelectedDriver(driver)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.85rem',
                          color: '#fff',
                          backgroundColor: '#007bff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {selectedDriver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: 500,
            width: '90%'
          }}>
            <h3 style={{ marginTop: 0 }}>Adjust Hours for {selectedDriver.displayName}</h3>
            <p style={{ color: '#666' }}>
              Current hours: {selectedDriver.calculatedHours.toFixed(2)}
              {selectedDriver.adjustment !== 0 && ` (adjusted: ${selectedDriver.hours.toFixed(2)})`}
            </p>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <strong>Adjustment (hours):</strong>
              <input
                type="number"
                step="0.01"
                value={adjustmentHours}
                onChange={e => setAdjustmentHours(e.target.value)}
                placeholder="e.g., +2 or -1.5"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '0.25rem'
                }}
              />
              <small style={{ color: '#666' }}>
                Use positive numbers to add hours, negative to subtract
              </small>
            </label>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <strong>Reason (optional):</strong>
              <input
                type="text"
                value={adjustmentReason}
                onChange={e => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Overtime on holiday"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '0.25rem'
                }}
              />
            </label>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={submitAdjustment}
                disabled={adjustmentHours === ''}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#fff',
                  backgroundColor: adjustmentHours === '' ? '#ccc' : '#28a745',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: adjustmentHours === '' ? 'not-allowed' : 'pointer'
                }}
              >
                Save Adjustment
              </button>
              <button
                onClick={() => {
                  setSelectedDriver(null);
                  setAdjustmentHours('');
                  setAdjustmentReason('');
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#666',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
