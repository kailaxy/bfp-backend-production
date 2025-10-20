# 🚨 URGENT: Database Migration from Render to Railway

**DEADLINE: October 18, 2025** - Render free tier database will be deleted!

---

## Step 1: Create Railway PostgreSQL Database (5 minutes)

1. Go to Railway Dashboard: https://railway.app/
2. Click on your project (`bfp-backend-production`)
3. Click **"+ New"** button
4. Select **"Database"** → **"Add PostgreSQL"**
5. Railway will provision the database and automatically add `DATABASE_URL` to your backend service
6. ✅ **Done!** Railway database is ready

---

## Step 2: Backup Render Database (10 minutes)

### Option A: Using pg_dump (Recommended)

```powershell
# Install PostgreSQL tools if you don't have them
# Download from: https://www.postgresql.org/download/windows/

# Export entire database
pg_dump "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.oregon-postgres.render.com:5432/bfpmapping_nua2" > render_db_backup.sql
```

### Option B: Using Render Dashboard

1. Go to Render Dashboard → Your PostgreSQL database
2. Click **"Backups"** tab
3. Click **"Create Backup"**
4. Download the backup file

---

## Step 3: Get Railway Database Connection String (2 minutes)

1. In Railway Dashboard, click on the **PostgreSQL** service
2. Go to **"Variables"** tab
3. Copy the `DATABASE_URL` value (it will look like):
   ```
   postgresql://postgres:RANDOM_PASSWORD@containers-us-west-xxx.railway.app:7432/railway
   ```

---

## Step 4: Import Data to Railway Database (10 minutes)

### Option A: Using psql

```powershell
# Restore backup to Railway
psql "RAILWAY_DATABASE_URL_HERE" < render_db_backup.sql
```

### Option B: Using Node.js Script

I can create a migration script that:
1. Connects to both databases
2. Copies all tables and data
3. Verifies the migration

---

## Step 5: Update Railway Backend Environment (2 minutes)

The `DATABASE_URL` should already be set automatically when you added the PostgreSQL service.

**Verify these variables exist:**
- ✅ `DATABASE_URL` (auto-set by Railway)
- ✅ `NODE_ENV` = `production`
- ✅ `DB_HOST` (REMOVE - not needed with DATABASE_URL)
- ✅ `DB_NAME` (REMOVE - not needed with DATABASE_URL)
- ✅ `DB_PASSWORD` (REMOVE - not needed with DATABASE_URL)
- ✅ `DB_PORT` (REMOVE - not needed with DATABASE_URL)
- ✅ `DB_USER` (REMOVE - not needed with DATABASE_URL)
- ✅ `GOOGLE_API_KEY` = `AIzaSyAdtpvRCLCEtSmn2MZi_P-QK7eJYReaBqM`

---

## Step 6: Test Railway Backend (5 minutes)

1. Wait for Railway to redeploy
2. Test endpoints:
   - https://bfp-backend-production.up.railway.app/api/barangays
   - https://bfp-backend-production.up.railway.app/api/firestation
   - https://bfp-backend-production.up.railway.app/api/forecasts

3. Login to admin panel and verify:
   - Fire stations appear on map
   - Hydrants load
   - Forecasts page shows 324 forecasts
   - Can generate new forecasts with Python

---

## Step 7: Update Frontend (Already Done! ✅)

Your frontend `railway-deploy` branch is already configured to use Railway backend.

**Render Frontend Environment:**
- VITE_API_BASE_URL = `https://bfp-backend-production.up.railway.app`
- VITE_GOOGLE_MAPS_API_KEY = (your key)

---

## Step 8: Keep Render as Backup (Optional)

Until October 18th, you can keep both databases running:
- **Railway**: Primary (new)
- **Render**: Backup (old)

This gives you a safety net in case anything goes wrong.

---

## Timeline

- **Today (Oct 9)**: Create Railway DB, export Render data
- **Oct 10**: Import to Railway, test thoroughly  
- **Oct 11-17**: Run both in parallel, monitor
- **Oct 18**: Render DB deleted (no longer accessible)

---

## Need Help?

I can create an automated migration script that handles the entire data transfer. Just say the word!
