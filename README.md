# Driver Pay Dashboard

A professional Next.js application that allows delivery drivers to view their month-to-date pay calculated in real-time from the Spoke Dispatch API.

## Features

- **Secure Login**: Dropdown selection of driver names with 6-digit PIN authentication
- **Automatic Plan Discovery**: Automatically fetches all plans from Spoke API (no manual configuration!)
- **Real-time Pay Calculation**: Calculates hours from actual route start/end times
- **Detailed Breakdown**: View all routes with hours and dates
- **Download Options**: Export pay statements as CSV or PDF
- **Professional UI**: Clean, modern interface optimized for drivers
- **Session Management**: Secure JWT-based authentication with logout functionality
- **Smart Caching**: 5-minute cache reduces API load

## Setup Instructions

### 1. Generate Driver PINs

Use the included script to generate random 6-digit PINs for your drivers:

```bash
node scripts/generate-pins.js samuel dwayne alice jordan
```

This will output:
- JSON for your environment variable
- Individual PINs to share with each driver

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
# Your Spoke API key
SPOKE_API_KEY=your_spoke_api_key_here

# Driver PINs (from generate-pins.js script)
PIN_STORE_JSON={"samuel":"123456","dwayne":"654321",...}

# Secure random string for JWT signing
JWT_SECRET=replace_this_with_a_secure_random_value

# Pay rate in GBP per hour (default: 15)
PAY_RATE=15
```

### 3. Install and Run

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## Deployment to Vercel

1. Push your code to GitHub
2. Create a new project in Vercel from your repository
3. Set environment variables in Vercel dashboard:
   - `SPOKE_API_KEY` (required)
   - `PIN_STORE_JSON` (required)
   - `JWT_SECRET` (required)
   - `PAY_RATE` (optional, defaults to 15)
4. Deploy!

## Usage

### For Drivers

1. Visit the application URL
2. Select your name from the dropdown
3. Enter your 6-digit PIN
4. Your pay data loads automatically
5. View your pay summary and detailed breakdown
6. Download your pay statement as CSV or PDF

### For Administrators

**Setting Up Drivers:**
1. Add driver to `lib/driver-mapping.js` with their Spoke driver ID
2. Generate PIN: `node scripts/generate-pins.js [all-driver-names]`
3. Update `PIN_STORE_JSON` environment variable
4. Share PIN securely with driver

**Managing Plans:**
- **No action needed!** Plans are automatically discovered from Spoke API
- Just create plans in Spoke as usual
- Drivers can view pay immediately
- See `PLAN-MANAGEMENT.md` for details

**Sharing PINs with Drivers:**
- The script outputs individual PINs for each driver
- Share these securely with each driver (e.g., in person, encrypted message)
- PINs are stored server-side only and never exposed to clients
- Driver names must match the names in `lib/driver-mapping.js`

## API Endpoints

### Public Endpoints
- `GET /api/drivers/list` - Returns list of driver names for login dropdown

### Authentication Endpoints
- `POST /api/auth/verify-pin` - Validates username/PIN and creates session
- `GET /api/auth/check` - Checks if current session is valid
- `POST /api/auth/logout` - Clears session cookie

### Protected Endpoints
- `GET /api/driver` - Returns pay data for authenticated driver (automatically uses driver ID from session)

## Architecture

- **Framework**: Next.js 14 (React 18)
- **Authentication**: JWT with HttpOnly cookies (8-hour expiration)
- **Data Source**: Spoke Dispatch API (no database)
- **Deployment**: Serverless (Vercel recommended)
- **Styling**: Inline styles (no external dependencies)

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SPOKE_API_KEY` | Yes | - | API key for Spoke Dispatch |
| `PIN_STORE_JSON` | Yes | `{}` | JSON mapping of username to PIN |
| `JWT_SECRET` | Yes | `dev-secret` | Secret for signing JWT tokens |
| `PAY_RATE` | No | `15` | Hourly pay rate in GBP |
| `DEFAULT_MONTH` | No | Current month | Override month for testing (YYYY-MM) |

## Security Notes

- PINs are stored server-side only (never sent to client)
- Session cookies are HttpOnly (protected from XSS)
- JWT tokens expire after 8 hours
- No sensitive data stored in database
- All driver data fetched on-demand from Spoke API

## File Structure

```
driver-pay-dashboard/
├── pages/
│   ├── index.js                    # Redirects to login
│   ├── login.js                    # Login page with dropdown + PIN
│   ├── dashboard.js                # Main dashboard with pay data
│   └── api/
│       ├── auth/
│       │   ├── verify-pin.js       # PIN verification endpoint
│       │   ├── check.js            # Session validation endpoint
│       │   └── logout.js           # Logout endpoint
│       ├── drivers/
│       │   └── list.js             # Driver names list endpoint
│       └── driver.js               # Pay data endpoint
├── lib/
│   └── driver-mapping.js           # Maps usernames to Spoke driver IDs
├── scripts/
│   └── generate-pins.js            # PIN generation utility
├── .env.example                    # Environment template
├── package.json
└── README.md
```

## Support

For issues or questions:
1. Check the environment variables are correctly set
2. Verify Spoke API key has proper permissions
3. Ensure driver names match exactly (case-sensitive)
4. Check browser console for client-side errors

## License

Private - Internal Use Only
