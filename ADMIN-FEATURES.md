# Admin Features Guide

## Overview

The Driver Pay Dashboard now includes comprehensive admin features:

1. **Admin Dashboard** - View all drivers at once
2. **Hour Adjustments** - Manually add/subtract hours for any driver
3. **Per-Driver Pay Rates** - Different hourly rates for each driver
4. **Audit Trail** - Track all adjustments with reasons

## Admin Access

### Setup

1. **Add admin to PIN_STORE_JSON:**
   ```env
   PIN_STORE_JSON={"admin":"999999","samuel":"123456",...}
   ```

2. **Login as admin:**
   - Username: `admin`
   - PIN: Your chosen 6-digit PIN

3. **Auto-redirect:**
   - Admin users are automatically redirected to `/admin`
   - Regular drivers go to `/dashboard`

## Admin Dashboard Features

### View All Drivers

The admin dashboard shows:
- **Driver Name** - Full name and username
- **Hours** - Total hours (after adjustments)
- **Adjustment** - Any manual hour adjustments
- **Rate** - Hourly pay rate
- **Pay** - Total pay for the month
- **Routes** - Number of routes completed
- **Actions** - Adjust hours button

### Summary Cards

Top summary shows:
- Total number of drivers
- Combined hours across all drivers
- Total payroll for the month

## Adjusting Hours

### When to Use Adjustments

Use hour adjustments for:
- ✅ Overtime not tracked in routes
- ✅ Bonus hours for holidays/special events
- ✅ Corrections for system errors
- ✅ Deductions for issues
- ✅ Manual time entries

### How to Adjust Hours

1. Click **"Adjust"** button next to driver name
2. Enter adjustment amount:
   - Positive number to add hours (e.g., `2.5`)
   - Negative number to subtract hours (e.g., `-1.5`)
3. Add reason (optional but recommended)
4. Click **"Save Adjustment"**

### Examples

**Adding Overtime:**
- Adjustment: `+3`
- Reason: "Christmas Day overtime"
- Result: Driver gets 3 extra hours of pay

**Fixing Error:**
- Adjustment: `-0.5`
- Reason: "Duplicate route counted"
- Result: Driver loses 0.5 hours

**Bonus:**
- Adjustment: `+8`
- Reason: "New Year's Day holiday pay"
- Result: Driver gets full day extra pay

### Adjustment Display

**For Drivers:**
- See adjustment note on their dashboard
- Shows reason if provided
- Example: "(+3 hours adjusted: Christmas Day overtime)"

**For Admins:**
- See calculated vs adjusted hours
- Color coded: green for additions, red for subtractions
- Reason displayed below adjustment

## Per-Driver Pay Rates

### Configuration

Edit `lib/driver-mapping.js`:

```javascript
const DRIVER_CONFIG = {
  "samuel": {
    spokeId: "drivers/C3FHHQMfuA0IsT4s5vMS",
    payRate: 18,  // £18/hour - senior driver
    displayName: "Samuel Wood"
  },
  "andrew": {
    spokeId: "drivers/qbpuf9YKNITFPeWP394N",
    payRate: 15,  // £15/hour - standard rate
    displayName: "Andrew Etherton"
  },
  "bradley": {
    spokeId: "drivers/QKd8NDExVzC7Bm4FHjlr",
    payRate: 12,  // £12/hour - trainee rate
    displayName: "Bradley"
  }
};
```

### Setting Pay Rates

**Factors to consider:**
- Experience level
- Job title (trainee, standard, senior)
- Qualifications
- Time with company
- Performance

**Common rates:**
- Trainee: £12-13/hour
- Standard: £15/hour
- Senior: £17-20/hour
- Lead: £20-25/hour

### Updating Rates

1. Edit `lib/driver-mapping.js`
2. Change `payRate` value
3. Commit and deploy
4. Takes effect immediately for new calculations

## Data Storage

### Adjustments File

Adjustments are stored in `data/adjustments.json`:

```json
{
  "samuel": {
    "2026-01": {
      "hours": 3,
      "reason": "Christmas Day overtime",
      "updatedAt": "2026-01-30T12:00:00.000Z"
    }
  },
  "andrew": {
    "2026-01": {
      "hours": -0.5,
      "reason": "Duplicate route fix",
      "updatedAt": "2026-01-28T10:30:00.000Z"
    }
  }
}
```

### Environment Variable Alternative

For serverless deployment (Vercel), use:

```env
ADJUSTMENTS_JSON={"samuel":{"2026-01":{"hours":3,"reason":"Overtime"}}}
```

## API Endpoints

### Admin Endpoints

**GET /api/admin/all-drivers**
- Requires admin authentication
- Returns all drivers with hours and pay
- Query params: `month` (optional, YYYY-MM format)

**POST /api/admin/adjust-hours**
- Requires admin authentication
- Body: `{ username, month, adjustment, reason }`
- Returns success/failure

### Regular Endpoints (Updated)

**GET /api/driver**
- Returns driver's own data
- Includes adjustments applied
- Shows calculated vs adjusted hours

## Security

### Admin Protection

- Admin users cannot see individual driver route details
- Admins see aggregate data only
- Regular drivers cannot access admin endpoints
- 403 Forbidden if non-admin tries `/api/admin/*`

### Adjustment Audit Trail

All adjustments include:
- **Username** - Who was adjusted
- **Month** - Which period
- **Amount** - How many hours
- **Reason** - Why it was done
- **Timestamp** - When it was made

### Best Practices

1. **Always include reasons** for adjustments
2. **Document significant changes** in external notes
3. **Review adjustments monthly** for accuracy
4. **Use positive/negative correctly**:
   - Adding hours: `+2` or `2`
   - Removing hours: `-2` (must be negative)

## Workflow Examples

### End of Month Process

1. **Review all drivers** in admin dashboard
2. **Check for missing hours** (routes not completed in system)
3. **Add adjustments** for overtime, holidays, etc.
4. **Verify totals** in summary card
5. **Export data** (CSV download per driver)
6. **Process payroll** based on adjusted figures

### Holiday Pay

**Scenario:** All drivers get 8 hours holiday pay on Christmas

1. Go to admin dashboard
2. For each driver, click "Adjust"
3. Enter: `+8`
4. Reason: "Christmas Day holiday pay"
5. Save

**Result:** Each driver gets £120 extra (8 hours × £15/hour)

### Correcting Errors

**Scenario:** Route was counted twice for Andrew

1. Find Andrew in admin dashboard
2. Click "Adjust"
3. Calculate duplicate hours: `-2.5`
4. Reason: "Removed duplicate route XYZ"
5. Save

**Result:** Andrew's hours reduced by 2.5

## Reporting

### Monthly Summary

Admin dashboard shows:
- Total drivers active
- Combined hours worked
- Total payroll cost
- Per-driver breakdown

### Individual Driver View

Click driver name to see:
- Route count
- Calculated hours (from routes)
- Adjustments (manual changes)
- Final hours (calculated + adjustment)
- Pay amount

### Export Options

Each driver can download:
- **CSV** - Spreadsheet format
- **PDF** - Printable pay statement

Both include adjustment details if present.

## Troubleshooting

### "Admin access required" error

**Problem:** Regular user trying to access admin features

**Solution:** Ensure username is in `ADMIN_USERS` array:
```javascript
const ADMIN_USERS = ["admin"];
```

### Adjustments not saving

**Problem:** File permission issues

**Solutions:**
1. Check `data/` directory exists
2. Ensure write permissions
3. Use `ADJUSTMENTS_JSON` env var instead

### Wrong pay rate showing

**Problem:** Driver seeing incorrect rate

**Solution:**
1. Check `lib/driver-mapping.js`
2. Verify `payRate` for that user
3. Restart server after changes

### Adjustment not showing for driver

**Problem:** Driver dashboard doesn't show adjustment

**Solution:**
1. Verify adjustment is for correct month
2. Check adjustment was saved successfully
3. Driver may need to refresh page

## Best Practices

### For Admins

1. **Document everything** - Always add reasons for adjustments
2. **Review regularly** - Check admin dashboard weekly
3. **Communicate** - Tell drivers about adjustments
4. **Be consistent** - Use same reason formats
5. **Backup data** - Save `data/adjustments.json` regularly

### For Developers

1. **Version control** - Commit rate changes with clear messages
2. **Test adjustments** - Verify math is correct
3. **Monitor** - Check for adjustment abuse
4. **Audit** - Review adjustment history
5. **Document** - Keep notes on rate changes

## Future Enhancements

Potential improvements:
- Adjustment approval workflow
- Adjustment history view
- Bulk adjustments
- Adjustment templates (holidays, etc.)
- Email notifications for adjustments
- Export all drivers to single CSV
- Graphical reports
- Monthly comparison charts

## Summary

The admin system provides:
- ✅ Complete oversight of all drivers
- ✅ Flexible hour adjustments
- ✅ Per-driver pay rates
- ✅ Audit trail for accountability
- ✅ Simple, intuitive interface
- ✅ Secure access control

All features are production-ready and fully functional!
