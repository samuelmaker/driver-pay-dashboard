import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Check authentication and load driver data
    const checkAuthAndLoad = async () => {
      const res = await fetch('/api/auth/check');
      if (res.ok) {
        const authData = await res.json();
        setUsername(authData.username);
        // Auto-load driver data
        loadDriverData();
      } else {
        router.push('/login');
      }
    };
    checkAuthAndLoad();
  }, [router]);

  async function loadDriverData() {
    setErr(null);
    setLoading(true);
    const res = await fetch('/api/driver');
    const j = await res.json();
    setLoading(false);
    if (res.ok) setData(j); else setErr(j.error || 'error');
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function downloadCSV() {
    if (!data) return;

    const rows = [
      ['Date', 'Hours', 'Route ID'],
      ...data.details.map(d => [
        d.date,
        d.hours,
        d.id
      ]),
      ['', '', ''],
      ['Total Hours', data.hours, ''],
      ['Hourly Rate', `£${data.rate}`, ''],
      ['Total Pay', `£${data.pay}`, '']
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pay-statement-${data.month}-${username}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    if (!data) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Pay Statement - ${data.month}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: 600; }
            .summary { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .summary h2 { margin-top: 0; color: #007bff; }
          </style>
        </head>
        <body>
          <h1>Driver Pay Statement</h1>
          <p><strong>Driver:</strong> ${username}</p>
          <p><strong>Period:</strong> ${data.month}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>

          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Hours:</strong> ${data.hours}</p>
            <p><strong>Hourly Rate:</strong> £${data.rate}</p>
            <p><strong>Total Pay:</strong> £${data.pay}</p>
          </div>

          <h3>Detailed Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Hours</th>
                <th>Route ID</th>
              </tr>
            </thead>
            <tbody>
              ${data.details.map(d => `
                <tr>
                  <td>${d.date}</td>
                  <td>${d.hours}</td>
                  <td>${d.id}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  if (!username) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{
      maxWidth: 900,
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
          <h1 style={{ margin: 0, color: '#333' }}>Driver Dashboard</h1>
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
          <p style={{ fontSize: '1.2rem', color: '#007bff', margin: 0 }}>Loading your pay data...</p>
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
            padding: '2rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '2px solid #007bff'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#007bff' }}>
              Pay Summary - {data.month}
            </h2>
            <div style={{ fontSize: '1.1rem' }}>
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Total Hours:</strong> {data.hours} hours
                {data.adjustment !== 0 && (
                  <span style={{
                    marginLeft: '1rem',
                    color: data.adjustment > 0 ? '#28a745' : '#dc3545',
                    fontSize: '0.9rem'
                  }}>
                    ({data.adjustment > 0 ? '+' : ''}{data.adjustment} hours adjusted
                    {data.adjustmentReason && `: ${data.adjustmentReason}`})
                  </span>
                )}
              </p>
              {data.adjustment !== 0 && data.calculatedHours !== undefined && (
                <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                  <strong>Calculated Hours:</strong> {data.calculatedHours} hours
                </p>
              )}
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Hourly Rate:</strong> £{data.rate}/hour
              </p>
              <p style={{
                margin: '1rem 0 0 0',
                fontSize: '1.8rem',
                fontWeight: '700',
                color: '#007bff'
              }}>
                Total Pay: £{data.pay}
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <button
              onClick={downloadCSV}
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#fff',
                backgroundColor: '#28a745',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Download CSV
            </button>
            <button
              onClick={downloadPDF}
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#fff',
                backgroundColor: '#dc3545',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Download PDF
            </button>
          </div>

          <div style={{
            backgroundColor: '#fff',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0 }}>Detailed Breakdown</h3>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    borderBottom: '2px solid #ddd'
                  }}>Date</th>
                  <th style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    borderBottom: '2px solid #ddd'
                  }}>Hours</th>
                  <th style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    borderBottom: '2px solid #ddd'
                  }}>Route ID</th>
                </tr>
              </thead>
              <tbody>
                {data.details.map((d, idx) => (
                  <tr key={d.id} style={{
                    backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9'
                  }}>
                    <td style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid #eee'
                    }}>{new Date(d.date).toLocaleDateString()}</td>
                    <td style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid #eee'
                    }}>{d.hours}</td>
                    <td style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid #eee',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem'
                    }}>{d.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
