# Driver Pay Dashboard — Quick Start Guide

## For Administrators

### Initial Setup

1. **Generate PINs for all drivers:**
   ```bash
   node scripts/generate-pins.js samuel dwayne alice jordan
   ```
   This creates random 6-digit PINs for each driver.

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Fill in the `.env` file with:
   - `SPOKE_API_KEY` - Your Spoke Dispatch API key
   - `PIN_STORE_JSON` - The JSON output from step 1
   - `JWT_SECRET` - A secure random string
   - `PAY_RATE` - Hourly rate in GBP (e.g., 15)

3. **Run locally:**
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000`

4. **Deploy to Vercel:**
   - Push code to GitHub
   - Create new Vercel project
   - Set the same environment variables in Vercel dashboard
   - Deploy

### Managing Drivers

**Adding new drivers:**
1. Run `node scripts/generate-pins.js` with all driver names (including new ones)
2. Update `PIN_STORE_JSON` in Vercel environment variables
3. Share the new PIN with the driver securely

**Removing drivers:**
1. Remove their entry from `PIN_STORE_JSON`
2. Update in Vercel and redeploy

### Sharing with Drivers

Send each driver:
1. The application URL (e.g., `https://your-app.vercel.app`)
2. Their personal 6-digit PIN
3. Their Spoke Driver ID

**Example message to driver:**
```
Hi Samuel,

Access your pay dashboard here: https://driver-pay.vercel.app

Your login details:
- Select your name from the dropdown
- PIN: 123456

Your pay data will load automatically when you log in.
You can download your pay statements as CSV or PDF.
```

## For Drivers

### How to Access Your Pay

1. **Visit the dashboard URL** provided by your admin
2. **Login:**
   - Select your name from the dropdown
   - Enter your 6-digit PIN
   - Click "Login"
3. **View your pay:**
   - Your pay data loads automatically
4. **Download statements:**
   - Click "Download CSV" for spreadsheet
   - Click "Download PDF" for printable statement

### What You'll See

- **Summary**: Total hours, hourly rate, and total pay for the current month
- **Breakdown**: Detailed list of all routes with dates and hours
- **Downloads**: Export your data for your records

### Troubleshooting

- **"Unknown user"**: Check that you selected the correct name
- **"Invalid PIN"**: Double-check your 6-digit PIN
- **"Driver ID not found"**: Contact your administrator - your account needs to be configured
- **Can't see data**: Make sure you're logged in properly

## Technical Details

### Architecture
- Next.js 14 serverless application
- JWT-based authentication (8-hour sessions)
- No database - all data fetched from Spoke API in real-time
- Secure PIN storage (server-side only)

### Endpoints
- `GET /api/drivers/list` - List of driver names
- `POST /api/auth/verify-pin` - Login endpoint
- `GET /api/auth/check` - Session validation
- `POST /api/auth/logout` - Logout endpoint
- `GET /api/driver` - Fetch pay data (authenticated, uses session username)

### Security Features
- Server-side PIN validation
- HttpOnly session cookies
- JWT token expiration (8 hours)
- No sensitive data in client code
- Real-time data fetching (no storage)

## Environment Variables Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `SPOKE_API_KEY` | Yes | `sk_live_...` | Spoke API authentication |
| `PIN_STORE_JSON` | Yes | `{"sam":"123456"}` | Driver PIN mappings |
| `JWT_SECRET` | Yes | `random-secure-string` | JWT signing secret |
| `PAY_RATE` | No | `15` | Hourly rate (default: 15) |
| `DEFAULT_MONTH` | No | `2024-01` | Testing month override |