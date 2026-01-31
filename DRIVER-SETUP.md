# Driver Setup Guide

## Adding a New Driver

When you need to add a new driver to the system, follow these steps:

### Step 1: Add Driver to Mapping File

Edit `lib/driver-mapping.js` and add the driver's entry:

```javascript
const DRIVER_ID_MAP = {
  // ... existing drivers ...
  "newdriver": "drivers/TheirSpokeDriverId",
};
```

**Important:**
- The key (left side) should be lowercase, no spaces (this is the username for login)
- The value (right side) is the full Spoke driver ID path

### Step 2: Generate PIN for New Driver

Run the PIN generation script with ALL driver names (including the new one):

```bash
node scripts/generate-pins.js samuel andrew dwayne nial steven papa kamil malcolm phillip saleem kerry steve bradley newdriver
```

This will output a new JSON with PINs for all drivers.

### Step 3: Update Environment Variable

Update the `PIN_STORE_JSON` environment variable:

**For local development:**
- Edit your `.env` file
- Replace the entire `PIN_STORE_JSON` value with the new JSON (single line, no spaces)

**For production (Vercel):**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Edit `PIN_STORE_JSON`
4. Paste the new JSON
5. Redeploy the application

### Step 4: Share Credentials

Send the new driver their login details:

```
Hi [Driver Name],

Access your pay dashboard: https://your-app.vercel.app

Login:
- Select "[username]" from dropdown
- PIN: [6-digit PIN]

Your pay data will load automatically.
```

## Current Driver List

| Username | Full Name | Spoke Driver ID |
|----------|-----------|-----------------|
| samuel | Samuel Wood | drivers/C3FHHQMfuA0IsT4s5vMS |
| andrew | Andrew Etherton | drivers/qbpuf9YKNITFPeWP394N |
| dwayne | Dwayne Wood | drivers/BGGAScfhbYMloTlHcN2I |
| nial | Nial Harrison | drivers/UwKdTMLtb9B3Olp2rfOc |
| steven | Steven Hoti | drivers/ajijcr2XxsyKEDIVLoTF |
| papa | Papa | drivers/owAnlpsVVGiozSvBVbx9 |
| kamil | Kamil | drivers/LYs6mPCbd2CBIdgzQlCw |
| malcolm | Malcolm | drivers/jSaX88Tw9wCLutcx20Yi |
| phillip | Phillip | drivers/btJz2WEttKnj43XY2jWO |
| saleem | Saleem | drivers/bA8SOYyoj2ZYnSUFvVQE |
| kerry | Kerry | drivers/sKzSHeJzCKOBT8XSxlXn |
| steve | Steve | drivers/tyRiKKu5jQ75CMYigPXb |
| bradley | Bradley | drivers/QKd8NDExVzC7Bm4FHjlr |

## Removing a Driver

### Step 1: Remove from Mapping

Edit `lib/driver-mapping.js` and delete their entry.

### Step 2: Regenerate PINs

Run the PIN generation script WITHOUT the removed driver's name.

### Step 3: Update Environment

Update `PIN_STORE_JSON` in both `.env` (local) and Vercel (production).

### Step 4: Deploy

Redeploy the application for changes to take effect.

## Troubleshooting

### Driver sees "Driver ID not found for user"

**Cause:** The driver's username is not in the `DRIVER_ID_MAP` in `lib/driver-mapping.js`

**Solution:**
1. Add their entry to `lib/driver-mapping.js`
2. Commit and deploy the changes

### Driver can't log in (unknown user)

**Cause:** The driver's username is not in `PIN_STORE_JSON`

**Solution:**
1. Regenerate PINs including this driver
2. Update `PIN_STORE_JSON` environment variable
3. Redeploy

### Driver sees wrong data

**Cause:** The Spoke driver ID in the mapping is incorrect

**Solution:**
1. Verify the correct Spoke driver ID
2. Update `lib/driver-mapping.js`
3. Commit and deploy

## Quick Reference Commands

Generate PINs for all current drivers:
```bash
node scripts/generate-pins.js samuel andrew dwayne nial steven papa kamil malcolm phillip saleem kerry steve bradley
```

Deploy to Vercel (after changes):
```bash
git add .
git commit -m "Update driver configuration"
git push
```

View deployment logs:
```bash
vercel logs
```
