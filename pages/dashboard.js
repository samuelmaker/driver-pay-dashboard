import { useEffect, useState } from "react";
import { useRouter } from "next/router";

function getSpokeUrl(routeId, planId) {
  if (!routeId || !planId) return null;
  const planIdPart = planId.replace("plans/", "");
  const routeIdPart = routeId.replace("routes/", "");
  return `https://dispatch.spoke.com/plans/${planIdPart}/route/${routeIdPart}`;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(timestampSeconds) {
  if (!timestampSeconds) return "-";
  return new Date(timestampSeconds * 1000).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDayKeyFromDateString(dateString) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch (e) {
    return "";
  }
}

function formatDayKeyLikeRouteDate(dayKey) {
  if (!dayKey || typeof dayKey !== "string") return "-";
  try {
    // Use midday UTC to avoid edge cases around DST shifting the local date.
    const d = new Date(`${dayKey}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", {
      timeZone: "Europe/London",
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch (e) {
    return "-";
  }
}

function getPayPeriodLabel(year, month) {
  // Pay period: 28th of previous month to 27th of current month
  let startYear = year;
  let startMonth = month - 1;
  if (startMonth < 1) {
    startMonth = 12;
    startYear = year - 1;
  }

  const startDate = new Date(startYear, startMonth - 1, 28);
  const endDate = new Date(year, month - 1, 27);

  const startStr = startDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const endStr = endDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return `${startStr} - ${endStr}`;
}

function formatPayPeriodFromMonth(monthStr) {
  // Convert YYYY-MM to a display string with pay period dates
  const [year, month] = monthStr.split("-").map(Number);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const periodRange = getPayPeriodLabel(year, month);
  return `${monthName} (${periodRange})`;
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  // Show current month and 11 previous months
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const value = `${year}-${String(month).padStart(2, "0")}`;
    const monthName = date.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    const periodRange = getPayPeriodLabel(year, month);
    const label = `${monthName} Pay (${periodRange})`;
    options.push({ value, label });
  }
  return options;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const res = await fetch("/api/auth/check");
      if (res.ok) {
        const authData = await res.json();
        setUsername(authData.username);
        // Set default month to current month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, "0")}`;
        setSelectedMonth(currentMonth);
      } else {
        router.push("/login");
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
    if (res.ok) setData(j);
    else setErr(j.error || "error");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function downloadCSV() {
    if (!data || !data.details) return;

    const rate = Number(data.rate || 0);

    const csvCell = (value) => {
      const s = value === null || value === undefined ? "" : String(value);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const formatMoney = (amount) => {
      const n = Number(amount || 0);
      const sign = n < 0 ? "-" : "";
      return `${sign}£${Math.abs(n).toFixed(2)}`;
    };

    const formatHoursForExport = (hours, status) => {
      if (status === "not_started") return "Not Started";
      if (status === "in_progress") return "In Progress";
      if (hours === null || hours === undefined || Number.isNaN(Number(hours)))
        return "In Progress";
      return Number(hours).toFixed(2);
    };

    const routeAmount = (hours, routeStatus) => {
      if (routeStatus !== "completed") return 0;
      const h = Number(hours);
      if (!Number.isFinite(h)) return 0;
      return h * rate;
    };

    const rows = [
      ["Date", "Hours", "Amount (£)", "Route"],
      ...data.details.map((d) => {
        const amount = routeAmount(d.hours, d.status);
        return [
          formatDate(d.date),
          formatHoursForExport(d.hours, d.status),
          formatMoney(amount),
          d.routeTitle || (d.id ? d.id.replace("routes/", "") : "Unknown"),
        ];
      }),
    ];

    if (Number(data.adjustment || 0) !== 0) {
      const adjustmentHours = Number(data.adjustment || 0);
      const adjustmentAmount = adjustmentHours * rate;
      rows.push([
        "Adjustment",
        adjustmentHours.toFixed(2),
        formatMoney(adjustmentAmount),
        data.adjustmentReason || "",
      ]);
    }

    rows.push(["", "", "", ""]);
    rows.push([
      "Calculated Hours",
      Number(data.calculatedHours || 0).toFixed(2),
      "",
      "",
    ]);
    rows.push(["Total Hours", Number(data.hours || 0).toFixed(2), "", ""]);
    rows.push(["Hourly Rate (£/hr)", rate.toFixed(2), "", ""]);
    rows.push(["Total Pay", formatMoney(data.pay || 0), "", ""]);

    const csvContent = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pay-statement-${data.month}-${username}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    if (!data || !data.details) return;

    const rate = Number(data.rate || 0);

    const formatMoney = (amount) => {
      const n = Number(amount || 0);
      const sign = n < 0 ? "-" : "";
      return `${sign}£${Math.abs(n).toFixed(2)}`;
    };

    const formatHoursForExport = (hours, status) => {
      if (status === "not_started") return "Not Started";
      if (status === "in_progress") return "In Progress";
      if (hours === null || hours === undefined || Number.isNaN(Number(hours)))
        return "In Progress";
      return Number(hours).toFixed(2);
    };

    const routeAmount = (hours, status) => {
      if (status !== "completed") return 0;
      const h = Number(hours);
      if (!Number.isFinite(h)) return 0;
      return h * rate;
    };

    const formatDateSafe = (dateStr) => {
      if (!dateStr) return "-";
      try {
        return new Date(dateStr).toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
      } catch (e) {
        return "-";
      }
    };

    const routeRows = data.details
      .map(
        (d) => `
      <tr>
        <td>${formatDateSafe(d.date)}</td>
        <td>${formatHoursForExport(d.hours, d.status)}</td>
        <td>${formatMoney(routeAmount(d.hours, d.status))}</td>
        <td>${
          d.routeTitle || (d.id ? d.id.replace("routes/", "") : "Unknown")
        }</td>
      </tr>
    `
      )
      .join("");

    const adjustmentRows = Object.entries(data.adjustmentsByDay || {})
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dayKey, adj]) => {
        const hours = Number(adj?.hours || 0);
        if (!Number.isFinite(hours) || hours === 0) return "";
        const prettyDate = formatDayKeyLikeRouteDate(dayKey);
        return `
          <tr>
            <td>${prettyDate}</td>
            <td>${hours.toFixed(2)}</td>
            <td>${formatMoney(hours * rate)}</td>
            <td>Adjustment (${prettyDate})${
          adj?.reason ? ` - ${adj.reason}` : ""
        }</td>
          </tr>
        `;
      })
      .filter(Boolean)
      .join("");

    const htmlContent = `
      <html>
        <head>
          <title>Pay Statement - ${formatPayPeriodFromMonth(data.month)}</title>
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
          <p><strong>Period:</strong> ${formatPayPeriodFromMonth(
            data.month
          )}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString(
            "en-GB"
          )}</p>

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
                <th>Amount (£)</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>
              ${routeRows}
              ${adjustmentRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      alert("Please allow pop-ups to download PDF");
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
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>
    );
  }

  const monthOptions = getMonthOptions();

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "2rem auto",
        padding: "2rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: "#333" }}>Driver Dashboard</h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#666" }}>
            Welcome, {username}
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={logout}
            style={{
              padding: "0.5rem 1.5rem",
              fontSize: "0.9rem",
              color: "#666",
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {loading && (
        <div
          style={{
            backgroundColor: "#f0f8ff",
            padding: "2rem",
            borderRadius: "8px",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          <p style={{ fontSize: "1.2rem", color: "#007bff", margin: 0 }}>
            Loading your pay data...
          </p>
        </div>
      )}

      {err && !loading && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fee",
            color: "#c33",
            borderRadius: "4px",
            marginBottom: "2rem",
          }}
        >
          {err}
        </div>
      )}

      {data && !loading && (
        <div>
          <div
            style={{
              backgroundColor: "#f0f8ff",
              padding: "2rem",
              borderRadius: "8px",
              marginBottom: "2rem",
              border: "2px solid #007bff",
            }}
          >
            <h2 style={{ margin: "0 0 1rem 0", color: "#007bff" }}>
              Pay Summary - {formatPayPeriodFromMonth(data.month)}
            </h2>
            <div style={{ fontSize: "1.1rem" }}>
              <p style={{ margin: "0.5rem 0" }}>
                <strong>Total Hours:</strong> {data.hours} hours
                {data.adjustment !== 0 && (
                  <span
                    style={{
                      marginLeft: "1rem",
                      color: data.adjustment > 0 ? "#28a745" : "#dc3545",
                      fontSize: "0.9rem",
                    }}
                  >
                    ({data.adjustment > 0 ? "+" : ""}
                    {data.adjustment} hours adjusted
                    {data.adjustmentReason && `: ${data.adjustmentReason}`})
                  </span>
                )}
              </p>
              {data.adjustment !== 0 && data.calculatedHours !== undefined && (
                <p
                  style={{
                    margin: "0.5rem 0",
                    fontSize: "0.9rem",
                    color: "#666",
                  }}
                >
                  <strong>Calculated Hours:</strong> {data.calculatedHours}{" "}
                  hours
                </p>
              )}
              <p style={{ margin: "0.5rem 0" }}>
                <strong>Hourly Rate:</strong> £{data.rate}/hour
              </p>
              <p
                style={{
                  margin: "1rem 0 0 0",
                  fontSize: "1.8rem",
                  fontWeight: "700",
                  color: "#007bff",
                }}
              >
                Total Pay: £{data.pay}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <button
              onClick={downloadCSV}
              style={{
                flex: 1,
                padding: "0.75rem",
                fontSize: "1rem",
                fontWeight: "600",
                color: "#fff",
                backgroundColor: "#28a745",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Download CSV
            </button>
            <button
              onClick={downloadPDF}
              style={{
                flex: 1,
                padding: "0.75rem",
                fontSize: "1rem",
                fontWeight: "600",
                color: "#fff",
                backgroundColor: "#dc3545",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Download PDF
            </button>
          </div>

          <div
            style={{
              backgroundColor: "#fff",
              padding: "2rem",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Detailed Breakdown</h3>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Hours
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Route
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.details.map((d, idx) => {
                  const spokeUrl = getSpokeUrl(d.id, d.planId);
                  const dayKey = getDayKeyFromDateString(d.date);
                  const isRouteFlagged = dayKey && data.flaggedDays && data.flaggedDays[dayKey]?.flagged;
                  const routeFlagReason = dayKey && data.flaggedDays && data.flaggedDays[dayKey]?.flagReason;
                  return (
                    <tr
                      key={d.id}
                      style={{
                        backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          {isRouteFlagged && (
                            <span
                              title={routeFlagReason || "Under review"}
                              style={{
                                color: "#f0ad4e",
                                cursor: "help",
                                fontSize: "1rem",
                              }}
                            >
                              &#9888;
                            </span>
                          )}
                          {formatDate(d.date)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        {d.status === "in_progress" ? (
                          <span style={{ color: "#f0ad4e", fontWeight: "500" }}>
                            In Progress
                          </span>
                        ) : d.status === "not_started" ? (
                          <span style={{ color: "#999" }}>Not Started</span>
                        ) : d.hours !== null ? (
                          d.hours
                        ) : (
                          "-"
                        )}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        {spokeUrl ? (
                          <a
                            href={spokeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#007bff",
                              textDecoration: "none",
                              fontFamily: "monospace",
                              fontSize: "0.9rem",
                            }}
                            onMouseOver={(e) =>
                              (e.target.style.textDecoration = "underline")
                            }
                            onMouseOut={(e) =>
                              (e.target.style.textDecoration = "none")
                            }
                          >
                            {d.routeTitle || d.id.replace("routes/", "")} ↗
                          </a>
                        ) : (
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.9rem",
                              color: "#666",
                            }}
                          >
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
