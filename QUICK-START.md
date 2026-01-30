# Quick Start Guide

Get your Driver Pay Dashboard running in 5 minutes!

## Prerequisites

- Node.js installed
- Spoke API key
- 13 drivers to set up

## Step 1: Fix Environment File (2 min)

Your `.env` file needs to be fixed. The `PIN_STORE_JSON` must be on **one line**:

```bash
# Open your .env file and replace the PIN_STORE_JSON with this format:
PIN_STORE_JSON={"samuel":"847291","andrew":"392847","dwayne":"618394","nial":"456789","steven":"567890","papa":"678901","kamil":"789012","malcolm":"890123","phillip":"901234","saleem":"012345","kerry":"112233","steve":"223344","bradley":"334455"}
```

Your complete `.env` should look like:

```env
SPOKE_API_KEY=4ce434dc71fc173203cb7a864f558a29
PIN_STORE_JSON={"samuel":"847291","andrew":"392847","dwayne":"618394","nial":"456789","steven":"567890","papa":"678901","kamil":"789012","malcolm":"890123","phillip":"901234","saleem":"012345","kerry":"112233","steve":"223344","bradley":"334455"}
JWT_SECRET=r8787n9yy98jiho78jy7y7ytftf56f65f7g8g8g7g86g
PAY_RATE=15
```

## Step 2: Test Locally (1 min)

```bash
# Restart the dev server
npm run dev
```

Visit: `http://localhost:3000`

## Step 3: Test Login (1 min)

1. Select "bradley" from dropdown
2. Enter PIN: `334455`
3. Click Login
4. You should see the dashboard!

## Step 4: Create Test Plan in Spoke (Optional)

To see actual pay data, create a test plan in Spoke:

1. Go to Spoke Dispatch dashboard
2. Create a new plan for today
3. Add some drivers (e.g., Bradley)
4. Add a few stops
5. Optimize and distribute
6. Mark a route as started and completed

Then refresh the driver dashboard to see hours!

## What Happens Next

### Automatic Plan Discovery

The system will:
- ✅ Automatically fetch all plans from Spoke
- ✅ Filter by current month
- ✅ Calculate hours from route timestamps
- ✅ Show pay breakdown

### No Configuration Needed!

Unlike the old system, you don't need to:
- ❌ Manually add plan IDs
- ❌ Update any registry files
- ❌ Redeploy every month

Just create plans in Spoke, and they appear automatically!

## Current Status

### ✅ Working
- Driver login with PIN
- Dropdown populated with 13 drivers
- Automatic logout
- Download CSV/PDF
- Automatic plan discovery from Spoke API
- Smart caching (5 min)

### ⚠️ Needs Setup
- **Environment file**: Fix `PIN_STORE_JSON` format (must be one line)
- **Plans**: Create some plans in Spoke to see data
- **Testing**: Test with each driver account

### 📋 Ready to Deploy
Once local testing works:

```bash
# Push to GitHub
git add .
git commit -m "Driver pay dashboard ready"
git push

# Deploy to Vercel
# - Set environment variables in Vercel dashboard
# - Use the SAME values from your .env file
# - Make sure PIN_STORE_JSON is one line!
```

## Troubleshooting

### Dropdown is empty

**Problem**: Driver names not showing in login dropdown

**Solution**:
1. Check `.env` file has `PIN_STORE_JSON` on ONE line (no line breaks)
2. Restart dev server: `npm run dev`
3. Check browser console for errors

### "Driver ID not found"

**Problem**: Driver can login but gets error

**Solution**:
1. Check `lib/driver-mapping.js` has the driver's username
2. Verify Spoke driver ID is correct

### No hours showing

**Problem**: Driver sees 0 hours

**Possible Causes**:
1. No plans created in Spoke for this month
2. Routes not started/completed yet
3. Driver not assigned to any routes
4. Timestamps missing from routes

**Debug**:
```bash
# Check server logs
# Look for: "Fetching plans for YYYY-MM from Spoke API"
# Should see plan count and route count
```

### API errors

**Problem**: "Failed to fetch plan" or "Failed to list plans"

**Solutions**:
- Verify `SPOKE_API_KEY` is correct
- Check API key has permission to read plans
- Test API key directly (uses Basic Auth - API key as username, empty password):
  ```bash
  curl -u "$SPOKE_API_KEY:" \
    https://api.getcircuit.com/public/v0.2b/plans?maxPageSize=1
  ```

## Next Steps

1. ✅ Fix `.env` file format
2. ✅ Test login locally
3. ✅ Create test plan in Spoke
4. ✅ Verify hours appear
5. ✅ Test downloads (CSV/PDF)
6. ✅ Deploy to Vercel
7. ✅ Share with drivers

## Key Files Reference

| File | Purpose |
|------|---------|
| `.env` | Environment variables (fix PIN_STORE_JSON!) |
| `lib/driver-mapping.js` | Maps usernames to Spoke driver IDs |
| `lib/spoke-api.js` | Automatic plan discovery & calculations |
| `pages/api/driver.js` | Main API endpoint |
| `pages/login.js` | Login page with dropdown |
| `pages/dashboard.js` | Driver dashboard |

## Documentation

- `README.md` - Full technical documentation
- `SETUP.md` - Deployment guide
- `PLAN-MANAGEMENT.md` - How plans work
- `AUTOMATIC-PLANS.md` - Automatic discovery details
- `DRIVER-SETUP.md` - Adding/removing drivers

## Getting Help

Check these first:
1. Browser console (F12) for frontend errors
2. Terminal for backend errors
3. Vercel logs for production errors

Common issues are usually:
- `.env` file formatting (PIN_STORE_JSON must be one line!)
- Missing plans in Spoke
- Incorrect driver ID mapping

---

**TL;DR:**
1. Fix `.env` → `PIN_STORE_JSON` must be ONE LINE
2. Restart server: `npm run dev`
3. Test login at `localhost:3000`
4. Create plans in Spoke to see data
5. Deploy when ready!
