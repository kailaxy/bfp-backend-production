# 🚀 Step-by-Step Database Migration Guide

## Prerequisites Checklist

- [ ] Railway PostgreSQL database created
- [ ] Railway DATABASE_URL copied
- [ ] Render database still accessible

---

## Step 1: Create Railway PostgreSQL Database (5 minutes)

1. Go to Railway Dashboard: https://railway.app/
2. Click on your project
3. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
4. Wait for provisioning (~1 minute)
5. Click on the PostgreSQL service
6. Go to **"Variables"** tab
7. Copy the `DATABASE_URL` value (starts with `postgresql://postgres:...`)

---

## Step 2: Prepare Environment Variable (2 minutes)

Create a temporary `.env.migration` file in the `bfp-backend` folder:

```bash
# Render database (source)
RENDER_DATABASE_URL=postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.oregon-postgres.render.com:5432/bfpmapping_nua2

# Railway database (destination) - PASTE YOUR RAILWAY URL HERE
RAILWAY_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@containers-us-west-xxx.railway.app:7432/railway
```

**IMPORTANT**: Replace `RAILWAY_DATABASE_URL` with your actual Railway database URL from Step 1!

---

## Step 3: Run Migration Script (10-15 minutes)

Open PowerShell in the `bfp-backend` folder and run:

```powershell
# Navigate to backend folder
cd "c:\Users\Kyle Sermon\bfp-project\bfp-backend"

# Load environment variables and run migration
$env:RENDER_DATABASE_URL="postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.oregon-postgres.render.com:5432/bfpmapping_nua2"
$env:RAILWAY_DATABASE_URL="YOUR_RAILWAY_DATABASE_URL_HERE"
node migrate_database.js
```

**OR** if you created `.env.migration`:

```powershell
# Copy .env.migration to .env temporarily
Copy-Item .env.migration .env -Force

# Run migration
node migrate_database.js

# Restore original .env after migration
git checkout .env
```

---

## Step 4: Verify Migration (5 minutes)

The script will show a summary like:

```
📊 MIGRATION SUMMARY
======================================================================
⏱️  Duration: 45.23 seconds
📦 Tables processed: 11
📝 Total rows migrated: 1,247

📋 Detailed Results:
  ✅ users                         12 rows
  ✅ fire_stations                 25 rows
  ✅ hydrants                      150 rows
  ✅ barangays                     182 rows
  ✅ arima_forecasts               324 rows
  ✅ active_fires                  3 rows
  ✅ incidents_history             234 rows
  ✅ incidents_reports             145 rows
  ✅ notifications                 89 rows
  ✅ fire_station_assignments      83 rows
  ℹ️  refresh_tokens               0 rows

✅ Migration completed successfully with no errors!
```

Check for:
- ✅ All tables migrated
- ✅ Row counts match
- ✅ No errors

---

## Step 5: Update Railway Backend Environment (2 minutes)

Go to Railway Dashboard → Backend Service → Variables:

**Remove these** (no longer needed):
- ❌ `DB_HOST`
- ❌ `DB_NAME`
- ❌ `DB_PASSWORD`
- ❌ `DB_PORT`
- ❌ `DB_USER`

**Keep/Add these**:
- ✅ `DATABASE_URL` (should already be set automatically by Railway PostgreSQL)
- ✅ `NODE_ENV` = `production`
- ✅ `GOOGLE_API_KEY` = `AIzaSyAdtpvRCLCEtSmn2MZi_P-QK7eJYReaBqM`

Railway will auto-redeploy (~1-2 minutes).

---

## Step 6: Test Railway Backend (5 minutes)

After Railway redeploys, test these endpoints:

1. **Base endpoint**:
   ```
   https://bfp-backend-production.up.railway.app/
   ```
   Should return: "BFP Mapping System API is running."

2. **Barangays**:
   ```
   https://bfp-backend-production.up.railway.app/api/barangays
   ```
   Should return 182 barangays

3. **Fire Stations**:
   ```
   https://bfp-backend-production.up.railway.app/api/firestation
   ```
   Should return 25 fire stations

4. **Forecasts**:
   ```
   https://bfp-backend-production.up.railway.app/api/forecasts
   ```
   Should return 324 forecasts

---

## Step 7: Test Frontend (5 minutes)

1. Open your frontend: https://bfp-frontend.onrender.com/
2. Check map loads with fire stations
3. Login as admin
4. Go to Forecasts menu → Should see 324 forecasts
5. Try "Generate Forecasts" button (should work with Python on Railway!)

---

## Step 8: Keep Render as Backup (Until Oct 18)

✅ Don't delete Render database yet!

Keep it as a backup until you're 100% confident Railway is working perfectly.

On **October 18**, Render will automatically delete it.

---

## Troubleshooting

### ❌ "RAILWAY_DATABASE_URL not set"
- Make sure you copied the DATABASE_URL from Railway PostgreSQL service
- Check the environment variable is set correctly

### ❌ "Connection refused" / "ECONNREFUSED"
- Railway database might still be provisioning (wait 2-3 minutes)
- Check Railway dashboard to see if database is "Active"

### ⚠️ "Row count mismatch"
- Some tables might have conflicts (ON CONFLICT DO NOTHING)
- Check the detailed results to see which tables have mismatches
- Usually safe if forecasts and fire_stations match

### ❌ "Table does not exist"
- Script will try to create tables automatically
- If it fails, you may need to run migrations first on Railway

---

## Success Checklist

- [ ] Migration script completed with ✅ status
- [ ] All row counts match
- [ ] Railway backend endpoints return data
- [ ] Frontend map shows fire stations
- [ ] Admin can see forecasts
- [ ] Generate Forecasts button works

---

## Need Help?

If anything goes wrong:
1. Check the error messages in the migration script output
2. Verify Railway DATABASE_URL is correct
3. Ask me for help! I can debug the issue.
