# Railway Deployment Guide for BFP Backend

This guide will help you deploy the BFP backend to Railway with full Python support for SARIMAX/ARIMA forecasting.

## 🎯 Why Railway?

- ✅ **Python Support on Free Tier** - Includes Python runtime
- ✅ **$5 Free Credit Monthly** - Enough for development/testing
- ✅ **Automatic Deployments** - Git push → auto deploy
- ✅ **Environment Variables** - Easy configuration
- ✅ **PostgreSQL Add-on** - Can use existing Render DB or Railway's

## 📋 Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **GitHub Connected** - Link your GitHub account
3. **Database** - Use existing Render PostgreSQL or create new Railway database

## 🚀 Deployment Steps

### 1. Create New Project on Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `kailaxy/bfp-backend`
5. Select branch: **`railway-deploy`**

### 2. Configure Build & Start Command

Railway will auto-detect Node.js, but verify:

- **Build Command:** `npm install` (auto-detected)
- **Start Command:** `node server.js` (already configured in railway.json)

### 3. Set Environment Variables

In Railway Dashboard → Your Service → Variables tab, add:

#### Required Variables:

```env
# Database Connection (use existing Render DB)
DATABASE_URL=postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com/bfpmapping_nua2

# Or individual connection params
DB_HOST=dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com
DB_NAME=bfpmapping_nua2
DB_USER=bfpmapping_nua2_user
DB_PASSWORD=mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L
DB_PORT=5432

# Server Configuration
PORT=5000
NODE_ENV=production

# JWT Secret (generate a new one for security)
JWT_SECRET=your_secure_jwt_secret_here_change_this

# Google API Key
GOOGLE_API_KEY=AIzaSyAdtpvRCLCftSmn2WZi_P-QK7eJYReaRqM
```

### 4. Install Python Dependencies

Railway automatically detects `requirements.txt` and installs Python packages!

Your `forecasting/requirements.txt` will be installed:
- pandas
- numpy
- statsmodels
- scipy

### 5. Deploy

Click **"Deploy"** button. Railway will:
1. ✅ Clone your repository
2. ✅ Install Node.js dependencies (`npm install`)
3. ✅ Install Python dependencies (from `requirements.txt`)
4. ✅ Start your server (`node server.js`)

### 6. Get Your Railway URL

After deployment completes:
- Click on your service
- Find **"Domains"** section
- Railway provides: `https://your-app-name.railway.app`
- You can also add a custom domain

### 7. Update Frontend URL

Update your frontend (`bfp-frontend`) to use the new Railway backend URL:

In `bfp-frontend/src/config.js` (or wherever API_BASE_URL is defined):
```javascript
const API_BASE_URL = 'https://your-app-name.railway.app';
```

## 🔧 Railway Configuration Files

### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### `nixpacks.toml` (Optional - for advanced Python config)
```toml
[phases.setup]
nixPkgs = ["nodejs", "python39", "python39Packages.pip"]

[phases.install]
cmds = ["npm install", "pip install -r forecasting/requirements.txt"]

[start]
cmd = "node server.js"
```

## 🧪 Testing the Deployment

### 1. Test Backend Health
```bash
curl https://your-app-name.railway.app/
```

### 2. Test Forecast Generation
Go to your admin panel:
```
https://your-frontend-url.onrender.com/admin/forecasts
```

Click **"Generate/Regenerate Forecasts"** - should work now with Python support! 🎉

## 💰 Cost Comparison

### Railway:
- **Free Tier:** $5 credit/month (~500 hours)
- **Hobby Plan:** $5/month for unlimited usage
- **Includes:** Node.js + Python + 512MB RAM

### Render (Current):
- **Free Tier:** Node.js only, no Python
- **Starter:** $7/month for Python support

**Railway saves $2/month and has better free tier!**

## 🔄 Migration Checklist

- [ ] Create Railway account
- [ ] Deploy backend to Railway
- [ ] Set all environment variables
- [ ] Test backend endpoints
- [ ] Test forecast generation (Generate button)
- [ ] Update frontend API URL
- [ ] Deploy frontend with new URL
- [ ] Test full application flow
- [ ] Monitor Railway usage/credits

## 📊 Database Options

### Option 1: Keep Render PostgreSQL (Recommended)
- No migration needed
- Just use existing DATABASE_URL
- Free tier includes 1GB storage

### Option 2: Use Railway PostgreSQL
- Click "New" → "Database" → "PostgreSQL"
- Railway provides DATABASE_URL automatically
- Need to migrate data from Render

## 🛠️ Troubleshooting

### Python packages not found
- Check Railway logs: Dashboard → Service → Deployments → View Logs
- Verify `requirements.txt` is in root or forecasting folder
- Railway should auto-detect and install

### Port issues
- Railway automatically sets PORT environment variable
- Make sure server.js uses: `const PORT = process.env.PORT || 5000;`

### Database connection errors
- Verify DATABASE_URL is correct
- Check if Render DB allows external connections (should be yes)
- Try individual DB_HOST, DB_USER, etc. instead of URL

### Forecast generation fails
- Check logs for Python errors
- Verify PYTHONIOENCODING=utf-8 is set (if needed)
- Test with: `py forecasting/arima_forecast_v2.py`

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DATABASE_URL | Yes | PostgreSQL connection string | postgresql://user:pass@host/db |
| PORT | No | Server port (Railway sets this) | 5000 |
| NODE_ENV | Yes | Environment mode | production |
| JWT_SECRET | Yes | Secret for JWT tokens | random_secure_string |
| GOOGLE_API_KEY | Yes | Google Maps API key | AIza... |

## 🚀 Next Steps After Migration

1. **Test Generate Button** - Should work without local script!
2. **Monitor Usage** - Check Railway credits/usage
3. **Set Up Monitoring** - Use Railway's built-in metrics
4. **Consider Upgrade** - If free credits run out, upgrade to Hobby ($5/month)

## 📞 Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **GitHub Issues:** Create issue in this repo

## 🎉 Benefits After Migration

✅ **Generate button works** - No more local script needed  
✅ **SARIMAX forecasting** - Full Python support  
✅ **Auto-deploy** - Push to GitHub → auto updates  
✅ **Better logs** - Railway has excellent logging  
✅ **Lower cost** - $5/month vs $7/month  
