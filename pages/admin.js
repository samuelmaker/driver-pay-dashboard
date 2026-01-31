import { useEffect, useState, Fragment } from 'react';
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

function formatTime(timestampSeconds) {
  if (!timestampSeconds) return '-';
  return new Date(timestampSeconds * 1000).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
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

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [expandedDriver, setExpandedDriver] = useState(null);
  const [adjustmentHours, setAdjustmentHours] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
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
    if (selectedMonth) {
      loadAllDrivers(selectedMonth);
    }
  }, [selectedMonth]);

  async function loadAllDrivers(month) {
    setErr(null);
    setLoading(true);
    const res = await fetch(`/api/admin/all-drivers?month=${month}`);
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
      setSelectedDriver(null);
      setAdjustmentHours('');
      setAdjustmentReason('');
      loadAllDrivers(selectedMonth);
    } else {
      const error = await res.json();
      alert('Error: ' + error.error);
    }
  }

  function toggleDriverExpand(username) {
    setExpandedDriver(expandedDriver === username ? null : username);
  }

  function downloadAllDriversCSV() {
    if (!data) return;

    const rows = [
      ['Driver', 'Username', 'Calculated Hours', 'Adjustment', 'Adjustment Reason', 'Total Hours', 'Rate (£/hr)', 'Total Pay (£)', 'Routes'],
      ...data.drivers.map(d => [
        d.displayName || '',
        d.username || '',
        (d.calculatedHours || 0).toFixed(2),
        d.adjustment !== 0 ? d.adjustment.toFixed(2) : '0',
        d.adjustmentReason || '',
        (d.hours || 0).toFixed(2),
        d.rate || 0,
        (d.pay || 0).toFixed(2),
        d.routeCount || 0
      ]),
      ['', '', '', '', '', '', '', '', ''],
      ['TOTALS', '', '', '', '', (data.totalHours || 0).toFixed(2), '', (data.totalPay || 0).toFixed(2), '']
    ];

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-drivers-pay-${data.month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadDriverCSV(driver) {
    if (!driver || !driver.routes) return;

    const formatHours = (hours) => {
      if (hours === null || hours === undefined) return 'In Progress';
      return hours.toFixed(2);
    };

    const rows = [
      [`Pay Statement for ${driver.displayName} - ${data.month}`],
      [''],
      ['Summary'],
      ['Calculated Hours', driver.calculatedHours.toFixed(2)],
      ['Adjustment', driver.adjustment !== 0 ? `${driver.adjustment.toFixed(2)} (${driver.adjustmentReason || 'No reason'})` : 'None'],
      ['Total Hours', driver.hours.toFixed(2)],
      ['Hourly Rate', `£${driver.rate}`],
      ['Total Pay', `£${driver.pay.toFixed(2)}`],
      [''],
      ['Route Breakdown'],
      ['Date', 'Hours', 'Route'],
      ...driver.routes
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .map(r => [
          formatDate(r.date),
          formatHours(r.hours),
          r.routeTitle || (r.id ? r.id.replace('routes/', '') : 'Unknown')
        ])
    ];

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${driver.username}-pay-${data.month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadDriverPDF(driver) {
    if (!driver || !driver.routes) return;

    const formatHours = (hours) => {
      if (hours === null || hours === undefined) return 'In Progress';
      return hours.toFixed(2);
    };

    const adjustmentColor = driver.adjustment > 0 ? '#28a745' : driver.adjustment < 0 ? '#dc3545' : '#666';

    const routeRows = driver.routes
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .map(r => `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td>${formatHours(r.hours)}</td>
          <td>${r.routeTitle || (r.id ? r.id.replace('routes/', '') : 'Unknown')}</td>
        </tr>
      `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Pay Statement - ${driver.displayName} - ${data.month}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #333; margin-bottom: 5px; }
            .subtitle { color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: 600; }
            .summary { background-color: #f0f8ff; padding: 20px; margin: 20px 0; border-radius: 4px; border: 2px solid #007bff; }
            .summary h2 { margin-top: 0; color: #007bff; }
            .total-pay { font-size: 1.5rem; font-weight: bold; color: #007bff; margin-top: 15px; }
            .adjustment { color: ${adjustmentColor}; }
          </style>
        </head>
        <body>
          <h1>Driver Pay Statement</h1>
          <p class="subtitle">${driver.displayName} (@${driver.username})</p>
          <p><strong>Period:</strong> ${data.month}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')}</p>

          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Calculated Hours:</strong> ${driver.calculatedHours.toFixed(2)}</p>
            ${driver.adjustment !== 0 ? `
              <p class="adjustment"><strong>Adjustment:</strong> ${driver.adjustment > 0 ? '+' : ''}${driver.adjustment.toFixed(2)} hours
              ${driver.adjustmentReason ? ` (${driver.adjustmentReason})` : ''}</p>
            ` : ''}
            <p><strong>Total Hours:</strong> ${driver.hours.toFixed(2)}</p>
            <p><strong>Hourly Rate:</strong> £${driver.rate}/hour</p>
            <p class="total-pay">Total Pay: £${driver.pay.toFixed(2)}</p>
          </div>

          <h3>Route Breakdown (${driver.routeCount} routes)</h3>
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
      maxWidth: 1200,
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
          <h1 style={{ margin: 0, color: '#333' }}>Admin Dashboard</h1>
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

      {data && !loading && (
        <div>
          <div style={{
            backgroundColor: '#f0f8ff',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '2px solid #007bff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 1rem 0', color: '#007bff' }}>
                  Summary - {new Date(data.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </h2>
                <div style={{ display: 'flex', gap: '2rem', fontSize: '1.1rem', flexWrap: 'wrap' }}>
                  <div><strong>Total Drivers:</strong> {data.totalDrivers}</div>
                  <div><strong>Total Hours:</strong> {data.totalHours.toFixed(2)}</div>
                  <div><strong>Total Pay:</strong> £{data.totalPay.toFixed(2)}</div>
                </div>
              </div>
              <button
                onClick={downloadAllDriversCSV}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#fff',
                  backgroundColor: '#28a745',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Download All (CSV)
              </button>
            </div>
          </div>

          <div style={{
            backgroundColor: '#fff',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0 }}>All Drivers</h3>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Click on a driver row to view their routes. Use the download buttons to get individual statements.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '800px'
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
                    <Fragment key={driver.username}>
                      <tr
                        onClick={() => toggleDriverExpand(driver.username)}
                        style={{
                          backgroundColor: expandedDriver === driver.username ? '#e8f4ff' : (idx % 2 === 0 ? '#fff' : '#f9f9f9'),
                          cursor: 'pointer',
                          transition: 'background-color 0.15s'
                        }}
                      >
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
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {driver.routeCount}
                            <span style={{ color: '#007bff', fontSize: '0.8rem' }}>
                              {expandedDriver === driver.username ? '▲' : '▼'}
                            </span>
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDriver(driver);
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.8rem',
                                color: '#fff',
                                backgroundColor: '#007bff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Adjust
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadDriverCSV(driver);
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.8rem',
                                color: '#fff',
                                backgroundColor: '#28a745',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              CSV
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadDriverPDF(driver);
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.8rem',
                                color: '#fff',
                                backgroundColor: '#dc3545',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedDriver === driver.username && driver.routes && driver.routes.length > 0 && (
                        <tr key={`${driver.username}-routes`}>
                          <td colSpan="7" style={{ padding: 0, borderBottom: '1px solid #eee' }}>
                            <div style={{
                              backgroundColor: '#f8fafc',
                              padding: '1rem 1.5rem',
                              borderLeft: '4px solid #007bff'
                            }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                  <tr>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd', color: '#666' }}>Date</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd', color: '#666' }}>Start</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd', color: '#666' }}>End</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd', color: '#666' }}>Hours</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd', color: '#666' }}>Route</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {driver.routes
                                    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                                    .map((route, rIdx) => {
                                      const spokeUrl = getSpokeUrl(route.id, route.planId);
                                      return (
                                        <tr key={route.id || rIdx} style={{
                                          backgroundColor: rIdx % 2 === 0 ? '#fff' : '#f8fafc'
                                        }}>
                                          <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                                            {formatDate(route.date)}
                                          </td>
                                          <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                                            {formatTime(route.startedAt)}
                                          </td>
                                          <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                                            {route.status === 'in_progress' ? (
                                              <span style={{ color: '#f0ad4e' }}>-</span>
                                            ) : (
                                              formatTime(route.completedAt)
                                            )}
                                          </td>
                                          <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                                            {route.status === 'in_progress' ? (
                                              <span style={{ color: '#f0ad4e', fontWeight: '500' }}>In Progress</span>
                                            ) : route.status === 'not_started' ? (
                                              <span style={{ color: '#999' }}>Not Started</span>
                                            ) : (
                                              route.hours !== null ? route.hours.toFixed(2) : '-'
                                            )}
                                          </td>
                                          <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                                            {spokeUrl ? (
                                              <a
                                                href={spokeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                  color: '#007bff',
                                                  textDecoration: 'none',
                                                  fontFamily: 'monospace',
                                                  fontSize: '0.85rem'
                                                }}
                                                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                              >
                                                {route.routeTitle || route.id.replace('routes/', '')} ↗
                                              </a>
                                            ) : (
                                              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#666' }}>
                                                {route.id}
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
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
              <strong>Month:</strong> {data.month}<br />
              <strong>Current calculated hours:</strong> {selectedDriver.calculatedHours.toFixed(2)}
              {selectedDriver.adjustment !== 0 && (
                <>
                  <br />
                  <strong>Current adjustment:</strong> {selectedDriver.adjustment > 0 ? '+' : ''}{selectedDriver.adjustment.toFixed(2)}
                  {selectedDriver.adjustmentReason && ` (${selectedDriver.adjustmentReason})`}
                </>
              )}
            </p>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <strong>New Adjustment (hours):</strong>
              <input
                type="number"
                step="0.01"
                value={adjustmentHours}
                onChange={e => setAdjustmentHours(e.target.value)}
                placeholder="e.g., 2 or -1.5"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '0.25rem',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ color: '#666' }}>
                This replaces any existing adjustment. Use positive numbers to add hours, negative to subtract. Enter 0 to remove adjustment.
              </small>
            </label>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <strong>Reason:</strong>
              <input
                type="text"
                value={adjustmentReason}
                onChange={e => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Overtime on bank holiday"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '0.25rem',
                  boxSizing: 'border-box'
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
