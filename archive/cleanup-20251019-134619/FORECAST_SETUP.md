# Forecast Generation - Current Setup

## ✅ What's Complete

### Frontend
- **AdminForecasts** component with full-width scrollable layout
- Collapsible barangay cards showing 12-month forecasts
- Search functionality
- **Generate/Regenerate button** (functional, ready for Render upgrade)
- Risk level badges (Low, Moderate, High, Very High)
- Model display (SARIMAX, ARIMA, ARIMA legacy)

### Backend
- API endpoint: `GET /api/forecasts/arima/all` - Fetches all forecasts
- API endpoint: `POST /api/forecasts/generate-enhanced` - Generate forecasts (ready for Python support)
- Database table: `forecasts` with `model_used` and `confidence_interval` columns
- SARIMAX priority logic in `forecasting/arima_forecast_v2.py`

## 🔄 Current Workflow (Render Free Tier)

Since Render free tier doesn't support Python, use the **local generation script**:

### Steps to Generate Forecasts

1. **Get Production Database URL**
   - Render Dashboard → bfp-backend → Environment → DATABASE_URL (Internal)
   
2. **Set Up Local Environment**
   ```bash
   cd bfp-backend
   
   # Create .env file
   echo "PRODUCTION_DATABASE_URL=postgresql://your_url_here" > .env
   
   # Install Python dependencies
   pip install pandas numpy statsmodels scipy
   
   # Install Node.js dependencies
   npm install
   ```

3. **Run Generation Script**
   ```bash
   node generate_and_upload_forecasts.js
   ```

4. **Verify Results**
   - Visit: https://bfp-frontend.onrender.com/admin/forecasts
   - Should see updated forecasts with "SARIMAX" or "ARIMA" model labels

### Script Features
- ✅ Fetches historical data from production
- ✅ Generates forecasts locally with SARIMAX priority
- ✅ Uploads results to production database
- ✅ Shows progress and model statistics
- ✅ Takes 2-5 minutes for 27 barangays

## 🚀 Future: After Render Upgrade

Once you upgrade to Render paid plan ($7/month):

1. **Install Python dependencies on Render**
   - Render will detect `requirements.txt`
   - Auto-install pandas, numpy, statsmodels, scipy

2. **Generate/Regenerate Button Works**
   - Click button in admin UI
   - Backend runs Python script directly
   - Forecasts generated on-demand

3. **No Local Script Needed**
   - Everything runs in production
   - Automated workflow

## 📊 Model Priority (As Per Groupmate)

**SARIMAX First, ARIMA as Fallback**

1. **SARIMAX** (Primary)
   - Seasonal ARIMA with 12-month periods
   - Better for seasonal patterns
   - More accurate for fire incident forecasting

2. **ARIMA** (Fallback only)
   - Non-seasonal model
   - Used when SARIMAX fails (insufficient data, convergence issues)
   - Logged with warnings

## 📁 Key Files

### Local Generation
- `generate_and_upload_forecasts.js` - Local generation script
- `LOCAL_FORECAST_GUIDE.md` - Detailed setup instructions
- `.env.example` - Environment variable template

### Forecasting
- `forecasting/arima_forecast_v2.py` - SARIMAX/ARIMA implementation
- `forecasting/requirements.txt` - Python dependencies
- `services/enhancedForecastService.js` - Production API (ready for Python)

### Frontend
- `bfp-frontend/src/components/AdminForecasts.jsx` - Admin UI
- `bfp-frontend/src/components/AdminForecasts.css` - Styling

### Database
- `migrations/add_model_used_to_forecasts.sql` - Column additions (✅ applied)
- `routes/migrations.js` - Migration API endpoints

## ⚙️ Configuration

### Database Table: `forecasts`
```sql
barangay_name VARCHAR(255)
year INTEGER
month INTEGER  -- 1-12
predicted_cases FLOAT
lower_bound FLOAT
upper_bound FLOAT
risk_level VARCHAR(50)
risk_flag BOOLEAN
model_used VARCHAR(100)  -- "SARIMAX", "ARIMA", "ARIMA (legacy)"
confidence_interval INTEGER  -- 95
created_at TIMESTAMP
UNIQUE (barangay_name, year, month)
```

### Risk Levels
- **Low**: predicted_cases < 5
- **Moderate**: 5 ≤ predicted_cases < 10
- **High**: 10 ≤ predicted_cases < 15
- **Very High**: predicted_cases ≥ 15

## 📋 Next Steps

1. **Generate Initial Forecasts**
   ```bash
   node generate_and_upload_forecasts.js
   ```

2. **Test Admin UI**
   - Visit: https://bfp-frontend.onrender.com/admin/forecasts
   - Verify forecasts display correctly
   - Check model labels (should be "SARIMAX" or "ARIMA")

3. **Talk with Groupmate**
   - Discuss Render upgrade ($7/month for Python support)
   - Decide on regeneration frequency (monthly?)

4. **After Render Upgrade**
   - Test Generate button in production
   - Remove local generation script from workflow
   - Set up automated monthly regeneration (optional)

## 🔧 Maintenance

### When to Regenerate
- 📅 Monthly (after new incident data added)
- 🔄 After historical data updates
- 🆕 When new barangays added
- 🐛 After forecasting algorithm improvements

### Monitoring
- Check forecast counts: Should be ~324 records (27 barangays × 12 months)
- Verify model distribution: Mostly SARIMAX, some ARIMA
- Monitor risk levels: Ensure realistic distribution

## 📞 Support

- **Local Generation Issues**: See `LOCAL_FORECAST_GUIDE.md`
- **Deployment Issues**: See `DEPLOYMENT_READY.md`
- **Forecasting Logic**: See `docs/12-month-forecasting-system.md`
- **Database Schema**: See `migrations/add_model_used_to_forecasts.sql`
