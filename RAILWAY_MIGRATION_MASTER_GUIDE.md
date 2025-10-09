# 🚂 Complete Railway Migration Guide

This is your complete guide to migrating the BFP Mapping system from Render to Railway for Python support.

## 📌 Quick Overview

**What we're doing:** Moving backend from Render to Railway to enable Python forecasting  
**Why:** Render free tier doesn't support Python, Railway free tier does  
**What changes:** Only backend URL, everything else stays the same  
**Cost:** $5/month Railway vs $7/month Render (saves $2/month!)

## 🎯 Migration Plan

### What Moves
- ✅ **Backend** → Railway (for Python support)

### What Stays
- ✅ **Frontend** → Render (just update API URL)
- ✅ **Database** → Render PostgreSQL (no migration needed)

## 📋 Prerequisites

- [ ] Railway account created: https://railway.app
- [ ] GitHub account connected to Railway
- [ ] Access to both repositories:
  - `kailaxy/bfp-backend` (railway-deploy branch)
  - `kailaxy/bfp-frontend` (railway-deploy branch)

## 🚀 Migration Steps

### Phase 1: Deploy Backend to Railway

**Repository:** `bfp-backend`  
**Branch:** `railway-deploy`  
**Documentation:** See `bfp-backend/RAILWAY_DEPLOY.md`

1. **Create Railway Project**
   - [ ] Go to [Railway Dashboard](https://railway.app/dashboard)
   - [ ] Click "New Project"
   - [ ] Select "Deploy from GitHub repo"
   - [ ] Choose `kailaxy/bfp-backend`
   - [ ] Select branch: `railway-deploy`

2. **Configure Environment Variables**
   
   In Railway Dashboard → Service → Variables, add:
   
   ```env
   DATABASE_URL=postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com/bfpmapping_nua2
   
   DB_HOST=dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com
   DB_NAME=bfpmapping_nua2
   DB_USER=bfpmapping_nua2_user
   DB_PASSWORD=mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L
   DB_PORT=5432
   
   PORT=5000
   NODE_ENV=production
   JWT_SECRET=<generate_new_secure_secret>
   GOOGLE_API_KEY=AIzaSyAdtpvRCLCftSmn2WZi_P-QK7eJYReaRqM
   ```

3. **Wait for Deployment**
   - [ ] Railway auto-installs Node.js packages
   - [ ] Railway auto-installs Python packages (pandas, statsmodels, etc.)
   - [ ] Check logs for successful deployment
   - [ ] Status should show "Active"

4. **Get Railway URL**
   - [ ] Click on service → Settings → Domains
   - [ ] Copy the URL (e.g., `https://bfp-backend-production.up.railway.app`)
   - [ ] Write it here: _______________________________________

5. **Test Backend**
   
   Test in browser or with curl:
   ```bash
   # Health check
   curl https://your-railway-url.up.railway.app/
   # Should return: "Welcome to BFP Mapping API"
   
   # Test forecasts endpoint
   curl https://your-railway-url.up.railway.app/api/forecasts/arima/all
   # Should return JSON with forecasts
   ```

### Phase 2: Update Frontend

**Repository:** `bfp-frontend`  
**Branch:** `railway-deploy`  
**Documentation:** See `bfp-frontend/RAILWAY_FRONTEND_UPDATE.md`

1. **Update API URL in Render**
   - [ ] Go to [Render Dashboard](https://dashboard.render.com)
   - [ ] Select `bfp-frontend` service
   - [ ] Click "Environment" tab
   - [ ] Update `VITE_API_BASE_URL` to Railway URL:
     ```
     VITE_API_BASE_URL=https://your-railway-url.up.railway.app
     ```
   - [ ] Click "Save Changes"
   - [ ] Wait for auto-redeploy (~2-3 minutes)

2. **Verify Frontend**
   - [ ] Visit your frontend URL
   - [ ] Check browser console (F12) for errors
   - [ ] Verify API requests go to Railway (Network tab)
   - [ ] Test login
   - [ ] Test map display

### Phase 3: Test Complete System

1. **Basic Features**
   - [ ] Homepage loads
   - [ ] Map displays active fires
   - [ ] Hydrants/stations toggle
   - [ ] Login works
   - [ ] Admin dashboard accessible

2. **Admin Features**
   - [ ] User management works
   - [ ] Monthly reports generate
   - [ ] Forecasts page displays data

3. **🎯 Critical Test: Generate Forecasts**
   - [ ] Go to Admin → Forecasts
   - [ ] Click "Generate/Regenerate Forecasts" button
   - [ ] Wait for completion (~2-5 minutes)
   - [ ] **Should succeed!** 🎉 (Python support on Railway)
   - [ ] Verify forecasts show SARIMAX model
   - [ ] Check risk levels updated
   - [ ] No errors in console

### Phase 4: Monitor & Verify

1. **Check Railway Logs**
   - [ ] Railway Dashboard → Service → Deployments → View Logs
   - [ ] Look for any errors
   - [ ] Verify Python packages loaded

2. **Monitor Usage**
   - [ ] Railway Dashboard → Service → Metrics
   - [ ] Check CPU/Memory usage
   - [ ] Monitor free credit balance

3. **Performance Check**
   - [ ] API response times acceptable (<2s)
   - [ ] Forecast generation completes (<5 minutes)
   - [ ] No timeout errors

## 📊 Migration Timeline

| Phase | Time Estimate | Status |
|-------|--------------|--------|
| Backend to Railway | 15-30 minutes | ⬜ |
| Frontend update | 5-10 minutes | ⬜ |
| Testing | 15-30 minutes | ⬜ |
| **Total** | **~1 hour** | ⬜ |

## ✅ Success Checklist

Mark each when complete:

### Backend
- [ ] Railway project created
- [ ] Backend deployed successfully
- [ ] Environment variables configured
- [ ] Python packages installed
- [ ] Backend URL obtained and tested
- [ ] API endpoints responding

### Frontend
- [ ] API URL updated in Render
- [ ] Frontend redeployed
- [ ] No CORS errors
- [ ] API requests go to Railway
- [ ] All features work

### System Tests
- [ ] Login/authentication works
- [ ] Map displays correctly
- [ ] Admin features accessible
- [ ] Monthly reports generate
- [ ] **Generate Forecasts button works** 🎉
- [ ] SARIMAX models showing in data
- [ ] No errors in production

## 🐛 Troubleshooting

### Backend Issues

**Problem:** Python packages not found  
**Solution:** Check Railway logs, verify `requirements.txt` exists, redeploy

**Problem:** Database connection fails  
**Solution:** Verify DATABASE_URL, check Render DB allows external connections

**Problem:** Port errors  
**Solution:** Railway sets PORT automatically, don't hardcode

### Frontend Issues

**Problem:** CORS errors  
**Solution:** Check backend CORS settings, add frontend URL to allowed origins

**Problem:** API requests still go to Render  
**Solution:** Clear cache, hard refresh (Ctrl+F5), verify env var saved

**Problem:** Login fails after migration  
**Solution:** Clear localStorage, try again, check JWT_SECRET matches

### Generate Forecasts Issues

**Problem:** "Error generating forecasts"  
**Solution:** Check Railway logs, verify Python script exists, test endpoint directly

**Problem:** Timeout errors  
**Solution:** Normal for first run, increase timeout, check Railway logs

## 💰 Cost Comparison

| Service | Before (Render) | After (Railway) | Savings |
|---------|----------------|-----------------|---------|
| Backend | $7/month (for Python) | $5/month | $2/month |
| Frontend | $0 (free tier) | $0 (free tier) | $0 |
| Database | $0 (free tier) | $0 (free tier) | $0 |
| **Total** | **$7/month** | **$5/month** | **$2/month** |

**Plus:** Railway includes $5 free credit monthly, so effectively free for small usage!

## 🔄 Rollback Plan

If issues occur, rollback quickly:

1. **Revert Frontend**
   ```
   VITE_API_BASE_URL=https://bfp-backend.onrender.com
   ```
   - [ ] Update in Render Dashboard
   - [ ] Wait for redeploy

2. **Keep Railway Running**
   - No need to delete
   - Debug without affecting users
   - Try again when ready

## 📝 Documentation References

- **Backend Migration:** `bfp-backend/RAILWAY_DEPLOY.md`
- **Backend Checklist:** `bfp-backend/RAILWAY_MIGRATION_CHECKLIST.md`
- **Frontend Update:** `bfp-frontend/RAILWAY_FRONTEND_UPDATE.md`
- **Frontend Checklist:** `bfp-frontend/RAILWAY_UPDATE_CHECKLIST.md`

## 🎉 What You Get After Migration

### Before (Render Free Tier)
- ❌ No Python support
- ❌ Generate button doesn't work
- ❌ Need local script for forecasts
- ❌ Manual process for updates

### After (Railway)
- ✅ Full Python support
- ✅ Generate button works from UI
- ✅ SARIMAX forecasting on-demand
- ✅ Automated workflow
- ✅ Lower cost ($5 vs $7/month)
- ✅ Better developer experience

## 🚀 Post-Migration Tasks

- [ ] Update team documentation
- [ ] Notify team of new backend URL
- [ ] Set up Railway usage alerts
- [ ] Schedule regular forecast regeneration
- [ ] Monitor performance for 1 week
- [ ] Consider custom domain (optional)
- [ ] Delete old Render backend (optional, after testing)

## 📞 Support Resources

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **GitHub Issues:** Create issue in respective repo
- **Team Communication:** Slack/Discord/Email

---

## ⚡ Quick Start Commands

### Test Backend
```bash
curl https://your-railway-url.up.railway.app/
curl https://your-railway-url.up.railway.app/api/forecasts/arima/all
```

### Update Frontend (Render)
```
Dashboard → bfp-frontend → Environment → 
VITE_API_BASE_URL=https://your-railway-url.up.railway.app
```

### Test Complete
```
Visit: https://bfp-frontend.onrender.com/admin/forecasts
Click: Generate/Regenerate Forecasts
Result: Should work! 🎉
```

---

**Migration Date:** _________________  
**Railway Backend URL:** _________________  
**Migration Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete  
**Completed By:** _________________
