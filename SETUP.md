# Driver Pay Dashboard - Setup Guide

## Quick Start (5 minutes)

### Step 1: Generate PINs

Run this command with all your driver names:

```bash
node scripts/generate-pins.js samuel dwayne alice jordan
```

**Output example:**
```
=== Generated PINs ===

Copy this JSON to your PIN_STORE_JSON environment variable:

{
  "samuel": "847291",
  "dwayne": "392847",
  "alice": "618394",
  "jordan": "729384"
}

=== Individual PINs (share with drivers) ===

samuel: 847291
dwayne: 392847
alice: 618394
jordan: 729384
```

### Step 2: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
SPOKE_API_KEY=your_spoke_api_key_here
PIN_STORE_JSON={"samuel":"847291","dwayne":"392847","alice":"618394","jordan":"729384"}
JWT_SECRET=use_a_long_random_string_here_at_least_32_characters
PAY_RATE=15
```

### Step 3: Install & Run

```bash
npm install
npm run dev
```

Visit: `http://localhost:3000`

### Step 4: Test Login

1. Select "samuel" from dropdown
2. Enter PIN: 847291
3. Click Login
4. Enter a test Spoke Driver ID
5. Click "Load Pay Data"

## Deploy to Production (Vercel)

### Option 1: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

When prompted, add environment variables:
- `SPOKE_API_KEY`
- `PIN_STORE_JSON`
- `JWT_SECRET`
- `PAY_RATE`

### Option 2: Vercel Dashboard

1. Push code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-org/driver-pay-dashboard.git
   git push -u origin main
   ```

2. Visit [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add Environment Variables:
   - Go to Settings → Environment Variables
   - Add all variables from your `.env` file
6. Click "Deploy"

### After Deployment

Your app will be live at: `https://your-app.vercel.app`

## Share with Drivers

Send each driver an email/message like this:

---

**Subject: Access Your Pay Dashboard**

Hi [Driver Name],

You can now view your pay online at:
**https://driver-pay.vercel.app**

**Your Login Details:**
- Name: Select "[driver name]" from dropdown
- PIN: [their 6-digit PIN]

**How to Use:**
1. Go to the website
2. Select your name and enter your PIN
3. Your pay data will load automatically
4. View your pay summary and download statements

Keep your PIN secure and don't share it with anyone.

---

## Adding/Removing Drivers

### Add a New Driver

1. Regenerate PINs including the new driver:
   ```bash
   node scripts/generate-pins.js samuel dwayne alice jordan [newdriver]
   ```

2. Update `PIN_STORE_JSON` in Vercel:
   - Settings → Environment Variables
   - Edit `PIN_STORE_JSON`
   - Paste new JSON
   - Save

3. Redeploy (automatic) or manually trigger

4. Share PIN with new driver

### Remove a Driver

1. Edit `PIN_STORE_JSON` to remove their entry
2. Update in Vercel environment variables
3. Redeploy

## Troubleshooting

### "Invalid PIN_STORE_JSON"

**Problem:** JSON syntax error in environment variable

**Solution:**
1. Regenerate using the script
2. Ensure valid JSON (use a JSON validator)
3. No trailing commas
4. All strings in double quotes

### "SPOKE_API_KEY not configured"

**Problem:** Missing or incorrect API key

**Solution:**
1. Verify API key in Vercel environment variables
2. Check API key is valid in Spoke dashboard
3. Ensure no extra spaces/characters

### Drivers can't log in

**Problem:** Username/PIN mismatch

**Solution:**
1. Check name matches exactly (case-sensitive)
2. Verify PIN in environment variables
3. Try regenerating and updating PINs

### No data showing

**Problem:** Spoke API connection issue

**Solution:**
1. Verify driver ID is correct
2. Check API key has proper permissions
3. Check Spoke API endpoint URL in `pages/api/driver.js`
4. Look at Vercel logs for errors

## Maintenance

### Update Pay Rate

1. Go to Vercel → Settings → Environment Variables
2. Update `PAY_RATE` value
3. Redeploy (automatic)

### View Logs

```bash
vercel logs your-app.vercel.app
```

Or visit Vercel dashboard → Deployments → [latest] → Logs

### Backup PINs

Always keep a secure backup of your `PIN_STORE_JSON`:
1. Store in password manager
2. Save encrypted copy offline
3. Never commit to git

## Security Best Practices

1. **Never commit** `.env` file to git (already in `.gitignore`)
2. **Use strong JWT_SECRET** (at least 32 random characters)
3. **Share PINs securely** (encrypted message, in person, password manager)
4. **Rotate PINs periodically** (every 3-6 months)
5. **Monitor access logs** in Vercel dashboard
6. **Keep dependencies updated** (`npm audit` regularly)

## Support

For technical issues:
1. Check Vercel deployment logs
2. Check browser console (F12)
3. Verify all environment variables are set
4. Test with a single driver first

For Spoke API issues:
1. Verify API key permissions
2. Check API documentation
3. Test endpoint directly with curl/Postman
