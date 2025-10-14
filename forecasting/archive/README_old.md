# Fire Risk Forecasting System

This system uses ARIMA/SARIMA time series analysis to predict fire incidents per barangay on a monthly basis. The forecasting algorithm is based on your original Google Colab script and has been adapted for integration with the BFP backend.

## Architecture Overview

```
bfp-backend/
├── forecasting/
│   ├── arima_forecast.py      # Python ARIMA algorithm (adapted from your Colab script)
│   └── requirements.txt       # Python dependencies
├── services/
│   └── forecastingService.js  # Node.js bridge to Python script
├── routes/
│   └── forecasts.js          # API endpoints for forecasts
└── scripts/
    ├── create_forecasts_table.js      # Database setup
    └── generate_monthly_forecasts.js  # Monthly cron job script
```

## Setup Instructions

### 1. Database Setup

First, create the forecasts table:

```bash
cd bfp-backend
node scripts/create_forecasts_table.js --sample-data
```

This creates the `forecasts` table with the following schema:
- `id` - Primary key
- `barangay_name` - Name of the barangay
- `month`, `year` - Target month/year for prediction
- `predicted_cases` - ARIMA forecast (decimal, not rounded)
- `lower_bound`, `upper_bound` - 95% confidence interval
- `risk_level` - "Very Low", "Low-Moderate", "Medium", "High"
- `risk_flag` - Boolean flag for high-risk barangays (Medium/High)
- `created_at`, `updated_at` - Timestamps

### 2. Python Environment Setup

Install Python dependencies for the ARIMA algorithm:

```bash
cd bfp-backend/forecasting
pip install -r requirements.txt
```

Required packages:
- pandas >= 1.5.0
- numpy >= 1.21.0  
- statsmodels >= 0.13.0
- scipy >= 1.9.0

### 3. Test Forecast Generation

Generate test forecasts for November 2025:

```bash
node scripts/generate_monthly_forecasts.js --year 2025 --month 11
```

This will:
1. Fetch historical fire data from `incidents_reports` table
2. Run the Python ARIMA script
3. Save predictions to the `forecasts` table
4. Display a summary of risk levels

## API Endpoints

### GET /api/forecasts/:year/:month
Get forecasts for a specific month/year:
```bash
curl http://localhost:5000/api/forecasts/2025/11
```

### GET /api/forecasts/latest
Get the most recent forecasts available:
```bash
curl http://localhost:5000/api/forecasts/latest
```

### POST /api/forecasts/generate (Admin only)
Generate new forecasts:
```bash
curl -X POST http://localhost:5000/api/forecasts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"year": 2025, "month": 12}'
```

### GET /api/forecasts/barangay/:name
Get forecast history for a specific barangay:
```bash
curl http://localhost:5000/api/forecasts/barangay/Centro?limit=6
```

## Monthly Automation

### Cron Job Setup

To automatically generate forecasts on the last day of each month, add this cron job:

```bash
# Run at 2 AM on the last day of every month
0 2 28-31 * * [ $(date -d +1day +\%d) -eq 1 ] && cd /path/to/bfp-backend && node scripts/generate_monthly_forecasts.js
```

Or use a more reliable approach with a specific script:

```bash
# /etc/cron.d/fire-forecasts
0 2 * * * root /path/to/bfp-backend/scripts/monthly_cron.sh
```

Create the cron wrapper script:
```bash
#!/bin/bash
# scripts/monthly_cron.sh

# Only run on last day of month
if [ $(date -d +1day +\%d) -eq 1 ]; then
    cd /path/to/bfp-backend
    /usr/bin/node scripts/generate_monthly_forecasts.js >> /var/log/fire-forecasts.log 2>&1
fi
```

## Algorithm Details

### Risk Categorization Rules
Based on your original Colab script:
- **High Risk** (≥5 cases): `risk_flag = true`
- **Medium Risk** (3-4.99 cases): `risk_flag = true`  
- **Low-Moderate Risk** (1-2.99 cases): `risk_flag = false`
- **Very Low Risk** (<1 case): `risk_flag = false`

### ARIMA Model Selection
The algorithm tries these approaches in order:
1. **ARIMA(1,1,1)** - First attempt
2. **SARIMA(1,1,1)(1,1,1,12)** - If ARIMA fails (seasonal patterns)
3. **Fallback to Historical Average** - If both models fail or insufficient data

### Data Requirements
- Minimum 6 months of historical data
- At least 3 months with non-zero incidents
- Falls back to historical average if insufficient data

## Frontend Integration

The frontend is already configured to consume these forecasts. The `fetchFireRiskForecasts()` function in `logic.jsx` calls the API and displays color-coded risk polygons on the map.

### Current Implementation Status
✅ **Completed:**
- Python ARIMA algorithm adapted from your Colab script
- Node.js service bridge
- Database schema and API endpoints
- Frontend fire risk layer (placeholder ready for real data)

🔄 **Next Steps:**
1. Run database setup script
2. Install Python dependencies  
3. Test forecast generation
4. Set up monthly cron job
5. Replace frontend placeholder data with real API calls

## Troubleshooting

### Common Issues

**Python script fails:**
- Check Python dependencies: `pip list | grep -E "(pandas|numpy|statsmodels)"`
- Verify Python path in Node.js spawn call
- Check temp directory permissions

**No historical data:**
- Ensure `incidents_reports` table has data with `barangay` field populated
- Check date formatting in database queries

**API returns 404:**
- Verify forecasts exist in database: `SELECT * FROM forecasts LIMIT 5;`
- Run forecast generation script first

**Frontend not showing risk polygons:**
- Check browser network tab for API call errors
- Verify `showFireRisk` state is true
- Check barangay name matching between forecasts and map polygons

## Monitoring

The system logs forecast generation progress and results. Key metrics to monitor:
- Number of barangays with forecasts generated
- Risk level distribution
- High-risk barangays requiring attention
- API response times and error rates

For production deployment, consider adding:
- Email notifications for high-risk forecasts
- Dashboard for forecast accuracy monitoring  
- Automated data quality checks
- Backup/rollback procedures for failed predictions