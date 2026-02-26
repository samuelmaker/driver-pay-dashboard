# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Driver Pay Dashboard is a Next.js application that allows delivery drivers to view their month-to-date pay calculated from the Spoke Dispatch API. Drivers log in with a 6-digit PIN and see hours worked, pay rates, and detailed route breakdowns.

## Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run generate-pins # Generate 6-digit PINs for drivers
```

No tests or linting configured.

## Architecture

### Pay Calculation Pipeline

1. Driver requests dashboard → `GET /api/driver?month=YYYY-MM`
2. `lib/spoke-api.js` fetches plans from Spoke API for the pay period
3. For each plan, fetches routes and calculates hours from `startedAt`/`completedAt` timestamps
4. Applies manual adjustments from `lib/adjustments.js`
5. Returns hours × pay rate with detailed breakdown

### Pay Period Logic

Pay periods run from the **28th of the previous month to the 27th of the current month**. This logic is applied consistently across plan filtering, hour calculations, and adjustments.

### Key Files

- `lib/spoke-api.js` - Core Spoke API integration with 1-hour caching for plans, routes, stops, and aggregated hours
- `lib/driver-mapping.js` - Maps usernames to Spoke driver IDs, pay rates, and display names
- `lib/adjustments.js` - Admin manual hour adjustments per driver per day
- `pages/api/driver.js` - Main endpoint returning driver pay data
- `pages/dashboard.js` - Main UI with pay summary, detailed breakdown, CSV/PDF exports

### Authentication

- Login: username + 6-digit PIN validated against `PIN_STORE_JSON` env var
- Session: JWT stored in HttpOnly `soda_session` cookie (8-hour expiration)
- All protected API endpoints verify JWT from cookie

### Caching

In-memory caches in `lib/spoke-api.js` expire after 1 hour:
- Plans per month
- Routes per plan
- Stops per route
- Aggregated driver hours per month

Admin can clear cache via `/api/admin/clear-cache`.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SPOKE_API_KEY` | Yes | API key for Spoke Dispatch (Basic Auth) |
| `PIN_STORE_JSON` | Yes | JSON mapping `{"username":"pin"}` |
| `JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars) |
| `PAY_RATE` | No | Default hourly rate in GBP (default: 15) |
| `DEFAULT_MONTH` | No | Override month for testing (YYYY-MM) |
| `ADJUSTMENTS_JSON` | No | JSON for adjustments (Vercel production) |
| `ADJUSTMENTS_FILE` | No | Path to adjustments file (local dev) |

## API Endpoints

- `GET /api/drivers/list` - Driver names for login dropdown
- `POST /api/auth/verify-pin` - Authenticate with username/pin
- `GET /api/auth/check` - Validate session
- `GET /api/driver?month=YYYY-MM` - Driver pay data (protected)
- `GET /api/admin/all-drivers?month=YYYY-MM` - All drivers' hours (admin)
- `POST /api/admin/adjust-hours` - Set manual adjustments (admin)

## Deployment

Designed for Vercel serverless deployment. No database - all data fetched from Spoke API. Adjustments stored in `ADJUSTMENTS_JSON` env var for production.
