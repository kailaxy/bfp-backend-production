# Railway Migration Checklist

## ✅ Pre-Migration (Completed)

- [x] Create `railway-deploy` branch
- [x] Add `railway.json` configuration
- [x] Add `nixpacks.toml` for Python setup
- [x] Create `RAILWAY_DEPLOY.md` documentation
- [x] Verify PORT environment variable usage in server.js
- [x] Verify `requirements.txt` exists for Python packages

## 📝 Migration Steps

### 1. Railway Setup
- [ ] Sign up at [railway.app](https://railway.app)
- [ ] Connect GitHub account
- [ ] Create new project from GitHub

### 2. Deploy Backend
- [ ] Select `kailaxy/bfp-backend` repository
- [ ] Choose `railway-deploy` branch
- [ ] Wait for initial deployment

### 3. Configure Environment Variables
Copy these to Railway Dashboard → Variables:

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

- [ ] All variables added
- [ ] JWT_SECRET changed to new secure value
- [ ] Redeploy after adding variables

### 4. Get Railway URL
- [ ] Copy Railway-provided URL (e.g., `https://bfp-backend-production.up.railway.app`)
- [ ] Test URL in browser: `https://your-url.railway.app/`
- [ ] Should see: "Welcome to BFP Mapping API"

### 5. Test Backend Endpoints
Test these endpoints:

- [ ] `GET /` - Welcome message
- [ ] `GET /api/active-fires` - Active fires data
- [ ] `GET /api/forecasts/arima/all` - Forecasts data
- [ ] `POST /api/auth/login` - Authentication works
- [ ] `POST /api/forecasts/generate-enhanced` - **Python forecasting works!** ✨

### 6. Update Frontend
In `bfp-frontend`:

- [ ] Update `src/config.js` or API configuration file
- [ ] Change `API_BASE_URL` from Render to Railway URL
- [ ] Example: `https://bfp-backend-production.up.railway.app`
- [ ] Commit changes to frontend
- [ ] Deploy frontend (Render or Vercel)

### 7. Test Full Application
- [ ] Login to admin panel
- [ ] View active fires map
- [ ] Check admin forecasts page
- [ ] **Click Generate/Regenerate Forecasts button** 🎉
- [ ] Verify forecasts update with SARIMAX model
- [ ] Test monthly reports generation
- [ ] Check all admin features

### 8. Monitor & Verify
- [ ] Check Railway logs for errors
- [ ] Monitor Railway usage/credits
- [ ] Verify Python packages installed correctly
- [ ] Test forecast generation multiple times

## 🔍 Testing Commands

### Test Backend Directly
```bash
# Test health
curl https://your-railway-url.railway.app/

# Test forecasts
curl https://your-railway-url.railway.app/api/forecasts/arima/all

# Test with auth (replace TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-railway-url.railway.app/api/admin/users
```

### Check Python in Railway
Railway console:
```bash
python --version
pip list | grep pandas
```

## 🐛 Troubleshooting

### If Python not detected:
- [ ] Check Railway logs for Python installation
- [ ] Verify `nixpacks.toml` is in root directory
- [ ] Check `forecasting/requirements.txt` exists
- [ ] Redeploy after fixing

### If database connection fails:
- [ ] Verify DATABASE_URL is correct
- [ ] Test connection from Railway console
- [ ] Check Render DB allows external connections
- [ ] Try individual DB params instead of URL

### If forecast generation fails:
- [ ] Check Railway logs for Python errors
- [ ] Verify `forecasting/arima_forecast_v2.py` exists
- [ ] Check file permissions
- [ ] Test Python script manually in Railway console

## 💰 Cost Tracking

Railway Free Tier:
- **$5 credit/month** (automatically applied)
- **~500 execution hours**
- Monitor usage in Railway Dashboard

If exceeded:
- **Hobby Plan:** $5/month unlimited
- Still cheaper than Render's $7/month!

## 🎯 Success Criteria

✅ All checks must pass:
- [ ] Backend deployed successfully
- [ ] All endpoints responding
- [ ] Python packages installed
- [ ] Forecast generation works from UI
- [ ] Frontend updated and working
- [ ] No errors in Railway logs
- [ ] SARIMAX model showing in forecasts

## 📊 Comparison Results

| Feature | Render Free | Render Starter | Railway Free | Railway Hobby |
|---------|-------------|----------------|--------------|---------------|
| Python Support | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| Cost | $0 | $7/month | $0* | $5/month |
| RAM | 512MB | 512MB | 512MB | 8GB shared |
| Always On | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |

*$5 credit monthly

## 🚀 Post-Migration

### Optional: Clean Up Render
Once Railway is confirmed working:
- [ ] Keep Render database (or migrate to Railway PostgreSQL)
- [ ] Can delete Render backend service
- [ ] Update documentation

### Next Steps
- [ ] Set up Railway alerts for usage
- [ ] Configure custom domain (optional)
- [ ] Set up GitHub Actions for CI/CD (optional)
- [ ] Document Railway deployment for team

## 📝 Notes

- Database: **Staying on Render PostgreSQL** (works fine, no migration needed)
- Frontend: **Staying on Render** (works fine, just update API URL)
- Backend: **Moving to Railway** (for Python support)

## 🎉 Migration Complete!

Once all checkboxes are ✅, you have successfully migrated to Railway with full Python support! 

The Generate/Regenerate button will now work directly from the admin UI without needing the local script! 🚀
