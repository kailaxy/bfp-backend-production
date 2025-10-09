# Railway Environment Variables Setup

## Critical Missing Variables

Your Railway backend is returning 500 errors because it's missing the database connection configuration. Add these environment variables in Railway:

### 1. DATABASE_URL (REQUIRED)
**Value**: Your Render PostgreSQL **Internal** connection string

```
postgresql://bfpmapping_nua2_user:YOUR_PASSWORD@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com/bfpmapping_nua2
```

**Where to find it**:
1. Go to Render Dashboard
2. Click on your PostgreSQL database (`bfpmapping`)
3. Scroll down to **Connections** section
4. Copy the **Internal Database URL** (NOT External)
5. It should start with `postgresql://` and end with `/bfpmapping_nua2`

### 2. NODE_ENV (REQUIRED)
```
production
```

### 3. JWT_SECRET (REQUIRED)
```
YOUR_JWT_SECRET_HERE
```
(Use the same JWT secret you have in Render backend)

### 4. GOOGLE_API_KEY (Optional)
```
YOUR_GOOGLE_MAPS_API_KEY
```
(Only if used server-side)

---

## How to Add Environment Variables in Railway

1. Go to Railway Dashboard: https://railway.app/
2. Click on your **bfp-backend-production** project
3. Click on the **Variables** tab
4. Click **+ New Variable**
5. Add each variable with its value
6. Click **Deploy** to apply changes

---

## Testing After Setup

After adding environment variables, Railway will automatically redeploy. Wait 1-2 minutes, then:

1. Check Railway logs for successful database connection
2. Test API endpoints:
   - https://bfp-backend-production.up.railway.app/
   - https://bfp-backend-production.up.railway.app/api/barangays
   - https://bfp-backend-production.up.railway.app/api/firestation

3. Test frontend connection (should no longer see 500 errors)

---

## Current Error

```
GET https://bfp-backend-production.up.railway.app/api/firestation 500 (Internal Server Error)
GET https://bfp-backend-production.up.railway.app/api/barangays 500 (Internal Server Error)
GET https://bfp-backend-production.up.railway.app/api/hydrants 500 (Internal Server Error)
GET https://bfp-backend-production.up.railway.app/api/active_fires 500 (Internal Server Error)
```

**Root Cause**: Backend can't connect to database because `DATABASE_URL` is missing.

**Solution**: Add the environment variables above and redeploy.
