Driver Pay Dashboard — MVP

Overview
- Next.js app (serverless) that shows drivers their month-to-date pay calculated live from the Spoke (Dispatch) API.
- MVP auth: username (driver name) + PIN (hardcoded server-side).
- No DB: all data fetched on-the-fly from Spoke API.
- Rate: £15/hour (configurable via env).

Local dev
1. Copy .env.example to .env
2. Fill in required secrets:
   - SPOKE_API_KEY (set in Vercel for production)
   - PIN_STORE_PATH (optional) or PIN_STORE_JSON (JSON string containing username->pin mapping)
   - JWT_SECRET
   - PAY_RATE (optional, default 15)
3. Install & run:
   - npm install
   - npm run dev

Deployment
- Recommended: Vercel. Create a new project from this repo and set environment variables in Vercel dashboard.
- Set SPOKE_API_KEY as a Vercel secret (do NOT commit it).

Secrets & pins
- For MVP, pins are stored server-side only. Two options:
  1) Provide PIN_STORE_JSON as an environment variable (JSON string: {"driverName": "123456", ...}).
  2) Upload a gitignored driver-pins.json to the project during deployment.
- Never store pins in client code or commit them to git.

Endpoints
- GET /api/driver?driverId=<spokeDriverId>
  - Requires authenticated session via JWT cookie.
  - Returns month-to-date hours and pay and per-route breakdown.
- POST /api/auth/verify-pin
  - Body: { username, pin }
  - Returns session cookie (JWT) on success.

Next steps to open PR
- I have scaffolded code locally in projects/driver-pay-dashboard. I can push to GitHub and open a PR if you provide a GitHub token with repo permissions, or I can give you the repo to push yourself.
