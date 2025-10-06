# Local Forecast Generation & Upload Guide

## 🎯 **Purpose**
Generate real ARIMA fire forecasts locally (where Python works) and upload them to your production Render database.

## 📋 **Prerequisites**

1. **Python Environment** (locally available)
   - Python 3.x installed
   - Required packages: `pip install pandas numpy statsmodels`

2. **Environment Variables**
   Create `.env` file with:
   ```bash
   # Production database (from Render dashboard)
   PRODUCTION_DATABASE_URL=your_render_postgres_url_here
   
   # OR use separate connection vars
   DATABASE_URL=your_render_postgres_url_here
   ```

3. **Get Production Database URL**
   - Go to your Render dashboard
   - Click on your PostgreSQL database 
   - Copy the "External Database URL"
   - Add to `.env` file

## 🚀 **Usage**

```bash
# 1. Make sure you're in the backend directory
cd bfp-backend

# 2. Install dependencies if needed
npm install

# 3. Generate and upload forecasts
node scripts/generate_and_upload_forecasts.js
```

## 📊 **What This Does**

1. ✅ **Generates real ARIMA forecasts locally** using your Python environment
2. ✅ **Uses actual historical fire data** for accurate predictions  
3. ✅ **Uploads to production database** on Render
4. ✅ **Clears old forecasts** and replaces with new ones
5. ✅ **Provides verification** of successful upload

## 🎉 **Result**

Your production frontend will now show **real fire risk predictions** based on ARIMA analysis, not random data or fallbacks.

## 🔧 **Troubleshooting**

- **"Python not found"**: Make sure Python is installed locally
- **"Database connection failed"**: Check your PRODUCTION_DATABASE_URL in .env
- **"Historical data not found"**: Verify your database has historical_fires table with data