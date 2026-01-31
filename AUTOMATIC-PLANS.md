# Automatic Plan Discovery ✨

## What Changed

The Driver Pay Dashboard now **automatically discovers plans** from your Spoke account. No more manual configuration!

## Before vs After

### ❌ Before (Manual Registry)

1. Create plans in Spoke
2. Copy plan IDs
3. Edit `lib/plan-registry.js`
4. Add plan IDs to config
5. Commit and deploy
6. Repeat every month

### ✅ After (Automatic Discovery)

1. Create plans in Spoke
2. **That's it!** ✨

Plans are automatically:
- Discovered via Spoke API
- Filtered by month
- Cached for performance
- Updated every 5 minutes

## How It Works

```javascript
// Old way (manual registry)
const PLAN_REGISTRY = {
  '2026-01': ['plans/abc', 'plans/def', 'plans/ghi'],
  // Had to manually add these!
};

// New way (automatic discovery)
const plans = await getPlansForMonth(2026, 1);
// Automatically fetches all plans for January 2026 from Spoke!
```

## Technical Details

### API Flow

1. **Driver views dashboard** → `/api/driver?month=2026-01`
2. **Parse month** → year=2026, month=1
3. **Check cache** → Is month cached and fresh?
   - **Yes**: Use cached plan list
   - **No**: Call Spoke API
4. **Spoke API**: `GET /plans` (with pagination)
5. **Filter**: Only plans where `starts.year=2026 AND starts.month=1`
6. **Cache**: Store results for 5 minutes
7. **Fetch routes**: Get all routes for each plan
8. **Calculate**: Hours from route timestamps
9. **Return**: Aggregated pay data

### Caching Strategy

- **What's cached**: List of plans per month
- **Cache duration**: 5 minutes
- **Cache location**: In-memory (cleared on restart)
- **Cache key**: `"YYYY-MM"` (e.g., `"2026-01"`)

### Performance

**First request (cold cache):**
- ~1 API call to list all plans
- Plans are filtered client-side
- Results cached for 5 minutes

**Subsequent requests (warm cache):**
- 0 API calls for plan list
- Only route fetching happens

**Example for 20 plans, 200 routes:**
- Cold: ~221 API calls
- Warm: ~220 API calls (plan list cached)

## Benefits

1. **Zero Configuration**
   - No manual plan ID tracking
   - No code changes needed per month
   - No deployment required

2. **Always Up-to-Date**
   - New plans appear automatically
   - No sync delay
   - No forgotten plans

3. **Less Maintenance**
   - One less file to maintain
   - Fewer deployment cycles
   - Less room for human error

4. **Better Performance**
   - Smart caching reduces API load
   - Configurable cache duration
   - Minimal latency impact

## Files Changed

### New Functions in `lib/spoke-api.js`

```javascript
listPlans(options)           // Fetch plans with pagination
getAllPlans(filter)          // Fetch all plans (auto-pagination)
getPlansForMonth(year, month) // Get & cache plans for month
getDriverHoursForMonth(y, m) // Complete workflow
```

### Updated Files

- `lib/spoke-api.js` - Added automatic plan discovery
- `pages/api/driver.js` - Uses `getDriverHoursForMonth()`
- `PLAN-MANAGEMENT.md` - Updated workflow docs
- `README.md` - Updated feature list

### Deprecated Files

- `lib/plan-registry.js` - No longer needed (can be deleted)

## Migration Guide

If you have an existing deployment with manual registry:

### Option 1: Clean Migration

```bash
# Remove old registry file
rm lib/plan-registry.js

# Commit changes
git add .
git commit -m "Enable automatic plan discovery"
git push
```

### Option 2: Keep as Backup

```bash
# Just rename it
mv lib/plan-registry.js lib/plan-registry.js.backup

# Commit
git add .
git commit -m "Enable automatic plan discovery (kept backup)"
git push
```

The code no longer imports or uses the registry file, so it's safe to delete or keep.

## Troubleshooting

### Plans not showing up

**Check:**
1. Plan `starts` date matches the month
2. Plans exist in Spoke
3. API key has permissions to list plans
4. Check server logs for API errors

**Test:**
```bash
# Test Spoke API directly (Basic Auth: API key as username, empty password)
curl -u "$SPOKE_API_KEY:" \
  https://api.getcircuit.com/public/v0.2b/plans?maxPageSize=20
```

### Cache not updating

**Solutions:**
1. Wait 5 minutes for cache to expire
2. Restart the server (clears cache)
3. Adjust `CACHE_DURATION_MS` in `lib/spoke-api.js`

### Too many API calls

**If you have 100+ plans:**
1. Increase cache duration (default 5 min)
2. Consider database caching
3. Use a cron job to pre-calculate nightly

## Configuration

### Adjust Cache Duration

Edit `lib/spoke-api.js`:

```javascript
// Default: 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

// Increase to 30 minutes
const CACHE_DURATION_MS = 30 * 60 * 1000;

// Or 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000;
```

### Disable Caching (for testing)

```javascript
const CACHE_DURATION_MS = 0; // Always fetch fresh
```

## FAQ

**Q: What if I have thousands of plans?**
A: The system fetches all plans and filters locally. With 1000+ plans, consider pagination or date filtering in the API call.

**Q: Can I still use manual registry?**
A: Yes, but it's not recommended. The automatic system is more reliable and requires less maintenance.

**Q: What about historical data?**
A: Spoke API data retention depends on your plan tier. Very old plans may return 403 errors.

**Q: Does this work for future months?**
A: Yes! If you pre-create plans for future months, they'll appear automatically.

**Q: How do I monitor API usage?**
A: Check Vercel function logs or add logging in `lib/spoke-api.js`.

## Summary

The Driver Pay Dashboard now:
- ✅ Automatically discovers plans from Spoke
- ✅ No manual configuration required
- ✅ Smart caching for performance
- ✅ Works out of the box
- ✅ Less maintenance overhead

Just create plans in Spoke as usual, and the dashboard handles the rest!
