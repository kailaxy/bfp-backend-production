# Local Forecast Generation Guide

This guide explains how to generate SARIMAX/ARIMA forecasts locally and upload them to your Render production database.

## Why Local Generation?

Render's free tier only supports Node.js and doesn't include Python runtime. Since our forecasting uses Python (pandas, statsmodels), we need to:
1. Generate forecasts on your local machine (which has Python)
2. Upload the results to the production database

## Prerequisites

### 1. Python 3.x Installation
Make sure Python 3 is installed:
```bash
python --version
```

### 2. Install Python Dependencies
```bash
cd bfp-backend
pip install pandas numpy statsmodels scipy
```

Or use the requirements file:
```bash
pip install -r forecasting/requirements.txt
```

### 3. Node.js Dependencies
```bash
npm install
```

### 4. Production Database URL

You need your production database connection string from Render:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Open your **bfp-backend** service
3. Click **Environment** tab
4. Find `DATABASE_URL` and copy the **Internal Database URL**
   - Format: `postgresql://user:pass@dpg-xxxxx.oregon-postgres.render.com/database`

5. Create `.env` file in `bfp-backend` folder:
```bash
# .env
PRODUCTION_DATABASE_URL=postgresql://your_actual_connection_string_here
```

**Important:** Never commit `.env` file - it's already in `.gitignore`

## Generate Forecasts

### Run the Script

```bash
node generate_and_upload_forecasts.js
```

### What It Does

The script will:
1. ✅ Connect to production database
2. 📊 Fetch all historical fire data
3. 📝 Prepare input file for Python
4. 🐍 Run SARIMAX/ARIMA forecasting (2-5 minutes)
5. 💾 Upload forecasts to production database
6. 🧹 Clean up temporary files

### Expected Output

```
🚀 Starting local forecast generation and upload...

Step 1: Fetching historical data from production database...
✅ Connected to production database
📊 Fetched 1234 barangay-month records

Step 2: Preparing input file for Python script...
📝 Input file prepared: temp/forecast_input_1234567890.json
   - Barangays: 27
   - Forecast months: 12

Step 3: Generating forecasts with SARIMAX/ARIMA...
🐍 Executing Python forecasting script...
   This may take 2-5 minutes...
...................................................
✅ Python script completed successfully

Step 4: Reading generated forecasts...
✅ Generated forecasts for 324 barangay-months
   Models used: SARIMAX, ARIMA

Step 5: Uploading forecasts to production database...
💾 Uploading 324 forecasts to production database...
   Uploaded 324/324 forecasts...
✅ Successfully uploaded 324 forecasts to production!

Step 6: Cleaning up temporary files...

✅ 🎉 Complete! Forecasts are now live in production.

You can now view them at: https://bfp-frontend.onrender.com/admin/forecasts
```

## Model Priority (SARIMAX First)

The script uses **SARIMAX** as the primary model with **ARIMA as fallback**:

- **SARIMAX** (Seasonal ARIMA): Used for barangays with seasonal patterns
- **ARIMA**: Only used if SARIMAX fails (insufficient data, convergence issues)

Each forecast record includes:
- `model_used`: "SARIMAX" or "ARIMA" 
- `confidence_interval`: 95% (default)
- `predicted_cases`: Forecasted number of incidents
- `lower_bound` / `upper_bound`: Confidence interval bounds
- `risk_level`: "Low", "Moderate", "High", "Very High"

## When to Regenerate

Run this script when:
- 📅 **Monthly**: After new incident data is added
- 🔄 **After data updates**: When historical records change
- 🆕 **New barangays**: When barangays are added to the system
- 🐛 **Model improvements**: After updating forecasting algorithm

## Troubleshooting

### Python not found
```bash
# Windows
python --version
# If not found, install from: https://www.python.org/downloads/

# Mac/Linux
python3 --version
```

### Missing Python packages
```bash
pip install pandas numpy statsmodels scipy
```

### Database connection error
- Check `PRODUCTION_DATABASE_URL` in `.env`
- Verify it's the **Internal Database URL** from Render
- Ensure no extra spaces or quotes

### Script takes too long
- Normal: 2-5 minutes for 27 barangays × 12 months
- If >10 minutes: Check Python script output for errors

### No forecasts generated
- Check Python script errors in console
- Verify historical data exists in database
- Ensure at least 12 months of data per barangay for SARIMAX

## Future: Render Paid Plan

Once you upgrade Render to a paid plan with Python support:

1. The **Generate/Regenerate** button in the admin UI will work directly
2. No need to run this local script
3. Forecasts can be generated on-demand from the web interface

Current cost: **$7/month** for Python support on Render

## Files Involved

- `generate_and_upload_forecasts.js` - Main orchestration script
- `forecasting/arima_forecast_v2.py` - Python forecasting with SARIMAX priority
- `forecasting/requirements.txt` - Python dependencies
- `services/enhancedForecastService.js` - Production API endpoint (for future use)
- `.env` - Local environment variables (not committed)

## Questions?

- Check the [Render deployment docs](../DEPLOYMENT_READY.md)
- Review [12-month forecasting system docs](docs/12-month-forecasting-system.md)
- Ask your groupmate who manages forecasting
