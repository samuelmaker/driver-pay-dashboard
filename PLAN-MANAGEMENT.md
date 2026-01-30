# Plan Management Guide

## Overview

The Driver Pay Dashboard **automatically** calculates driver hours by:
1. **Automatically fetching all plans** for a specific month from Spoke API
2. Getting all **routes** within each plan
3. Calculating hours for each route based on `startedAt` and `completedAt` timestamps
4. Aggregating hours by driver

## ✨ Automatic Plan Discovery

**No manual configuration required!** The system automatically:
- Fetches all plans from your Spoke account
- Filters plans by month based on their `starts` date
- Caches results for 5 minutes to minimize API calls
- Updates automatically when new plans are created

## How It Works

### Data Flow

```
Month (e.g., 2026-01)
  └─> Spoke API: List all plans
       └─> Filter plans where starts.year=2026 AND starts.month=1
            └─> Cache for 5 minutes
                 └─> For each plan: Get routes array
                      └─> Spoke API: Fetch each route
                           └─> Extract driver ID, startedAt, completedAt
                                └─> Calculate hours (completedAt - startedAt)
                                     └─> Aggregate by driver
```

### Key Components

1. **Spoke API Helper** (`lib/spoke-api.js`)
   - `listPlans()` - Fetches plans with pagination
   - `getAllPlans()` - Fetches all plans (handles pagination automatically)
   - `getPlansForMonth(year, month)` - Gets plans for specific month with caching
   - `getDriverHoursForMonth(year, month)` - Complete workflow for a month
   - Calculates hours from route timestamps
   - Aggregates data by driver
   - 5-minute cache to reduce API load

2. **Driver Mapping** (`lib/driver-mapping.js`)
   - Maps usernames to Spoke driver IDs

3. **Plan Registry** (`lib/plan-registry.js`)
   - **DEPRECATED** - No longer needed! Plans are fetched automatically
   - Can be safely deleted or kept as backup

## Workflow (Fully Automatic)

### What You Do:

1. **Create plans in Spoke** (as usual)
   - Go to Spoke Dispatch dashboard
   - Create plans for each day/period
   - Assign drivers to routes
   - Optimize and distribute

2. **That's it!** 🎉
   - The dashboard automatically finds your plans
   - Drivers can view their pay immediately
   - Data updates every 5 minutes

### What Happens Automatically:

1. Driver logs in and views dashboard
2. System calls `getDriverHoursForMonth(year, month)`
3. First request:
   - Fetches all plans from Spoke API
   - Filters by month
   - Caches for 5 minutes
4. Subsequent requests (within 5 min):
   - Uses cached plan list
   - Only fetches route details if needed
5. After 5 minutes:
   - Cache expires
   - Next request fetches fresh plan list

## Testing

### Test with a specific month:

```bash
# In browser console or API test
fetch('/api/driver?month=2026-01', {
  credentials: 'include' // Include auth cookie
}).then(r => r.json()).then(console.log)
```

### Check logs in Vercel:

1. Go to Vercel Dashboard
2. Select your project
3. Click "Deployments" → Latest deployment
4. View "Functions" logs
5. Look for any errors from Spoke API calls

## Troubleshooting

### No data showing for a month

**Problem:** Driver sees 0 hours

**Possible Causes:**
1. **No plans created yet** - Create plans in Spoke for that month
2. **Plans not started** - Ensure plan `starts` date matches the month
3. **Routes not completed** - Only completed routes with timestamps count
4. **Driver not assigned** - Check routes have correct driver assigned

### "Failed to fetch plan" errors

**Problem:** Spoke API returns 404 or 403

**Solutions:**
- **404**: Plan ID doesn't exist or was deleted
  - Remove from registry or fix the ID
- **403**: Plan is older than your data retention period
  - Upgrade Spoke plan or remove old plan IDs
- **401**: API key invalid
  - Check `SPOKE_API_KEY` environment variable

### Hours showing as 0

**Problem:** Routes exist but hours are 0

**Possible Causes:**
1. Routes haven't been started yet (`state.started === false`)
2. Routes haven't been completed yet (`state.completed === false`)
3. `startedAt` or `completedAt` timestamps are missing

**Solution:**
- Ensure routes are fully completed in Spoke
- Check route state in Spoke dashboard
- Only completed routes with valid timestamps count toward hours

### Driver not seeing their routes

**Problem:** Other drivers see data but one doesn't

**Checklist:**
1. Is the driver assigned to routes in Spoke?
   - Check `route.driver` field matches their Spoke ID
2. Is their username mapped correctly?
   - Check `lib/driver-mapping.js`
3. Are they on the right plan IDs?
   - Verify plans in `lib/plan-registry.js` include their routes

## API Structure

### Route State Object

```json
{
  "state": {
    "completed": true,
    "completedAt": 1706745600000,  // Unix timestamp in milliseconds
    "distributed": true,
    "distributedAt": 1706659200000,
    "started": true,
    "startedAt": 1706707200000,
    "notifiedRecipients": true,
    "notifiedRecipientsAt": 1706659200000
  }
}
```

### Hour Calculation

```javascript
// Only routes with both timestamps are counted
if (route.state.startedAt && route.state.completedAt) {
  const durationMs = route.state.completedAt - route.state.startedAt;
  const hours = durationMs / (1000 * 60 * 60);
}
```

## Best Practices

1. **Use consistent plan naming**
   - Name plans clearly in Spoke (e.g., "Deliveries - Jan 15, 2026")
   - Makes it easier to track and debug

2. **Complete routes promptly**
   - Only completed routes with timestamps appear in pay calculations
   - Incomplete routes = missing hours

3. **Monitor cache behavior**
   - Cache refreshes every 5 minutes
   - If you need immediate updates, restart the server or wait 5 min

4. **Check Spoke data retention**
   - Historical data depends on your Spoke plan tier
   - Older plans may become inaccessible (403 errors)

5. **Test with new accounts**
   - Add a test driver to verify the system works
   - Check their hours appear correctly

## Performance & Caching

### Current Caching Strategy

- **Plans list cached for 5 minutes per month**
- **Individual routes NOT cached** (fetched fresh each time)
- Cache stored in memory (cleared on server restart)

### API Call Breakdown

For a driver viewing January 2026 pay:
1. **First request (cache miss):**
   - 1 call to list all plans
   - 1 call per plan to get routes (e.g., 20 plans = 20 calls)
   - 1 call per route (e.g., 200 routes = 200 calls)
   - **Total: ~221 API calls**

2. **Subsequent requests (within 5 min):**
   - 0 calls for plan list (cached)
   - 1 call per plan (20 calls)
   - 1 call per route (200 calls)
   - **Total: ~220 API calls**

### Optimization Tips

If you have many drivers viewing simultaneously:
1. **Increase cache duration** (edit `CACHE_DURATION_MS` in `lib/spoke-api.js`)
2. **Use a database** to cache route data
3. **Pre-calculate nightly** using a cron job
4. **Use Redis** for shared cache across serverless functions

## Summary

**Monthly Workflow (Simplified):**
1. Create plans in Spoke as usual
2. Drivers can view their pay immediately
3. System automatically finds and processes all plans
4. No manual configuration needed! ✨

**Key Files:**
- `lib/spoke-api.js` - Automatic plan fetching & calculation
- `lib/driver-mapping.js` - Driver ID mapping
- `pages/api/driver.js` - Main API endpoint
- ~~`lib/plan-registry.js`~~ - Deprecated (no longer needed)
