# Admin Guide (Non‑Technical)

This guide is for **admins who use the Driver Pay Dashboard**, not for developers setting it up.

## What this app does (in plain English)

- **Drivers** can log in and see their **hours and pay** for a chosen month.
- **Admins** can log in and see **all drivers** at once, download totals, and **adjust hours** when something needs correcting (e.g., overtime, missed clocking, deductions).

## Logging in as an Admin

1. Open the Driver Pay Dashboard link in your browser.
2. On the login screen:
   - In **Select Your Name**, choose **`admin`**
   - Enter the **6‑digit PIN** you were given
3. Click **Login**

You’ll land on the **Admin Dashboard**.

## Admin Dashboard tour

At the top you will see:

- **Month selector**: choose which month you are reviewing (current month or up to the last 11 months).
- **Logout** button

### Summary box (top)

The summary shows:

- **Total Drivers**: how many drivers are in the system
- **Total Hours**: combined hours for the selected month (includes adjustments)
- **Total Pay**: combined pay for the selected month (includes adjustments)

You can also use:

- **Download All (CSV)**: downloads one spreadsheet containing every driver’s totals for the selected month.

### All Drivers table (main section)

Each driver row shows:

- **Driver**: the driver’s name and username
- **Hours**: the driver’s total hours for the selected month  
  - If you see “(calc: X)”, that means the app calculated X hours from routes, and then **an adjustment changed the final total**.
- **Adjustment**: any manual change you’ve applied (green = added hours, red = removed hours)
- **Rate**: hourly rate
- **Pay**: total pay for the month
- **Routes**: how many routes were found for that month

## Viewing a driver’s routes

1. Click a driver row (anywhere on the row).
2. The row expands to show **route details**, including:
   - date
   - start time
   - end time (or “In Progress”)
   - hours (or status)
   - a route link (↗) to open the route in Spoke (if available)

Click the row again to collapse it.

## Downloading statements

From the **All Drivers** table, each driver has quick export buttons:

- **CSV**: downloads a spreadsheet pay statement for that driver (includes totals and a route breakdown).
- **PDF**: opens a printable statement (you may need to allow pop‑ups).

For totals across everyone:

- Use **Download All (CSV)** in the summary section.

## Adjusting hours (most important admin feature)

Use adjustments when the route-based hours are correct *most of the time* but you need to fix exceptions:

- overtime
- holiday pay
- a missed route/time entry
- a correction (duplicate counted, etc.)

### Open the adjustment screen

1. Find the driver in the table.
2. Click the **Adjust** button on that driver’s row.

### What you’ll see

The pop‑up shows:

- the **month** you’re editing
- the **calculated hours** (from routes)
- the **current adjustment** (if any)

### Enter the adjustment

In **New Adjustment (hours)**:

- Enter a **positive** number to add hours  
  - Example: `2` (adds two hours)
- Enter a **negative** number to remove hours  
  - Example: `-1.5` (removes one and a half hours)
- Enter **0** to remove an existing adjustment

In **Reason** (recommended):

- Add a short note like “Bank holiday pay”, “Overtime”, “Removed duplicate route”, etc.

### Save (or cancel)

- Click **Save Adjustment** to apply it
- Click **Cancel** to close without changing anything

After saving, the table refreshes and you’ll see the adjustment shown in the driver’s row.

## How adjustments affect what drivers see

When you adjust a driver’s hours:

- Their **Total Hours** and **Total Pay** change immediately for that month.
- On the driver’s dashboard, they will see a note like:
  - “(+2 hours adjusted: Overtime)” (or similar)

## Common issues (quick fixes)

### “Admin access required”

- This usually means you did **not** log in as `admin`.
- Log out, then log back in selecting `admin`.

### “Please allow pop-ups to download PDF”

- Allow pop‑ups for the site, then try **PDF** again.

### The hours look wrong / missing

- First, confirm you selected the correct **month**.
- If routes show “Not Started” or “In Progress”, the route may not have a completed time yet (so hours may be incomplete).
- If it still looks wrong, note the driver name + month and send it to the technical owner to investigate in Spoke.


