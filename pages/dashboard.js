import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

function getSpokeUrl(routeId, planId) {
  if (!routeId || !planId) return null;
  const planIdPart = planId.replace('plans/', '');
  const routeIdPart = routeId.replace('routes/', '');
  return `https://dispatch.spoke.com/plans/${planIdPart}/route/${routeIdPart}`;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  // Show current month and 11 previous months
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const res = await fetch('/api/auth/check');
      if (res.ok) {
        const authData = await res.json();
        setUsername(authData.username);
        // Set default month to current month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(currentMonth);
      } else {
        router.push('/login');
      }
    };
    checkAuthAndLoad();
  }, [router]);

  useEffect(() => {
    if (selectedMonth && username) {
      loadDriverData(selectedMonth);
    }
  }, [selectedMonth, username]);

  async function loadDriverData(month) {
    setErr(null);
    setLoading(true);
    const res = await fetch(`/api/driver?month=${month}`);
    const j = await res.json();
    setLoading(false);
    if (res.ok) setData(j); else setErr(j.error || 'error');
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function downloadCSV() {
    if (!data || !data.details) return;

    const formatHours = (hours) => {
      if (hours === null || hours === undefined) return 'In Progress';
      return hours;
    };

    const rows = [
      ['Date', 'Hours', 'Route'],
      ...data.details.map(d => [
        `"${formatDate(d.date)}"`,
        `"${formatHours(d.hours)}"`,
        `"${d.routeTitle || (d.id ? d.id.replace('routes/', '') : 'Unknown')}"`
      ]),
      ['', '', ''],
      ['Total Hours', data.hours || 0, ''],
      ['Hourly Rate', `£${data.rate || 0}`, ''],
      ['Total Pay', `£${data.pay || 0}`, '']
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pay-statement-${data.month}-${username}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    if (!data || !data.details) return;

    const formatHours = (hours) => {
      if (hours === null || hours === undefined) return 'In Progress';
      return hours;
    };

    const formatDateSafe = (dateStr) => {
      if (!dateStr) return '-';
      try {
        return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      } catch (e) {
        return '-';
      }
    };

    const routeRows = data.details.map(d => `
      <tr>
        <td>${formatDateSafe(d.date)}</td>
        <td>${formatHours(d.hours)}</td>
        <td>${d.routeTitle || (d.id ? d.id.replace('routes/', '') : 'Unknown')}</td>
      </tr>
    `).join('');

    const htmlContent = `
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
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')}</p>

          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Hours:</strong> ${data.hours || 0}</p>
            <p><strong>Hourly Rate:</strong> £${data.rate || 0}</p>
            <p><strong>Total Pay:</strong> £${data.pay || 0}</p>
          </div>

          <h3>Detailed Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Hours</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>
              ${routeRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow pop-ups to download PDF');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  if (!username) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  const monthOptions = getMonthOptions();

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
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>Driver Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Welcome, {username}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
      </div>

      {loading && (
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

      {err && !loading && (
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

      {data && !loading && (
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
                  }}>Route</th>
                </tr>
              </thead>
              <tbody>
                {data.details.map((d, idx) => {
                  const spokeUrl = getSpokeUrl(d.id, d.planId);
                  return (
                    <tr key={d.id} style={{
                      backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9'
                    }}>
                      <td style={{
                        padding: '0.75rem',
                        borderBottom: '1px solid #eee'
                      }}>{formatDate(d.date)}</td>
                      <td style={{
                        padding: '0.75rem',
                        borderBottom: '1px solid #eee'
                      }}>
                        {d.status === 'in_progress' ? (
                          <span style={{ color: '#f0ad4e', fontWeight: '500' }}>In Progress</span>
                        ) : d.status === 'not_started' ? (
                          <span style={{ color: '#999' }}>Not Started</span>
                        ) : (
                          d.hours !== null ? d.hours : '-'
                        )}
                      </td>
                      <td style={{
                        padding: '0.75rem',
                        borderBottom: '1px solid #eee'
                      }}>
                        {spokeUrl ? (
                          <a
                            href={spokeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#007bff',
                              textDecoration: 'none',
                              fontFamily: 'monospace',
                              fontSize: '0.9rem'
                            }}
                            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                          >
                            {d.routeTitle || d.id.replace('routes/', '')} ↗
                          </a>
                        ) : (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            color: '#666'
                          }}>
                            {d.routeTitle || d.id}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
