# Enhanced ARIMA/SARIMAX Forecasting System

## 🎯 Overview

This enhanced forecasting system implements the improved ARIMA/SARIMAX models developed through Colab experiments. It provides:

- **Automatic Model Selection**: Compares ARIMA and SARIMAX models, selects best performer
- **Square-Root Transformation**: Stabilizes variance for better predictions
- **Seasonal Detection**: SARIMAX models capture monthly fire patterns
- **Robust Fallbacks**: Multiple model candidates ensure forecasts succeed
- **Comprehensive Diagnostics**: AIC, RMSE, MAE metrics for model evaluation

---

## 🔧 System Components

### 1. Python Script: `arima_forecast_v2.py`

**Purpose**: Core forecasting engine using statsmodels

**Key Features**:
- Tests multiple ARIMA candidates: (1,0,1), (2,0,1), (1,0,2), (1,0,0)
- Tests multiple SARIMAX candidates with seasonal component (period=12)
- Applies square-root transformation for variance stabilization
- Validates models using last 6 months as test set
- Generates forecasts with 95% confidence intervals

**Model Selection Logic**:
```python
1. Try SARIMAX models (seasonal)
2. Try ARIMA models (non-seasonal)
3. Compare using RMSE on validation set
4. Select best model based on performance
5. Retrain on full dataset
6. Generate forecasts
```

### 2. Node.js Service: `enhancedForecastService.js`

**Purpose**: Bridge between database and Python forecasting

**Workflow**:
```
1. Fetch historical fire data from PostgreSQL
2. Aggregate by barangay and month
3. Create JSON input for Python script
4. Execute Python script via spawn
5. Parse JSON output with forecasts
6. Store forecasts in arima_forecasts table
7. Clean up temporary files
```

### 3. API Endpoint: `/api/forecasts/generate-enhanced`

**Method**: POST  
**Auth**: Admin only  
**Purpose**: Trigger enhanced forecast generation

**Request Body**:
```json
{
  "forecastMonths": 12,
  "targetDate": "2025-12-01",
  "keepTempFiles": false
}
```

**Response**:
```json
{
  "success": true,
  "duration": 45.32,
  "forecasts_generated": 324,
  "forecasts_stored": 324,
  "barangays_processed": 27,
  "successful_barangays": 27,
  "models_summary": {
    "Addition Hills": {
      "model_type": "SARIMAX",
      "order": [1, 0, 1],
      "seasonal_order": [1, 0, 1, 12],
      "aic": 145.32,
      "validation_rmse": 0.4521,
      "mae": 0.3142,
      "rmse": 0.4201
    },
    ...
  }
}
```

---

## 📊 Model Types

### ARIMA Models
**Format**: ARIMA(p, d, q)
- **p**: Autoregressive order
- **d**: Differencing order (always 0 - we use sqrt transform instead)
- **q**: Moving average order

**Candidates Tested**:
- ARIMA(1,0,1) - Simple AR+MA
- ARIMA(2,0,1) - More AR lag
- ARIMA(1,0,2) - More MA lag
- ARIMA(1,0,0) - Fallback AR only

### SARIMAX Models
**Format**: SARIMAX(p,d,q)(P,D,Q,s)
- **Seasonal component (P,D,Q,s)** with s=12 (monthly seasonality)

**Candidates Tested**:
- SARIMAX(1,0,1)(1,0,1,12) - Seasonal AR+MA
- SARIMAX(1,1,1)(1,0,1,12) - With differencing
- SARIMAX(2,0,1)(0,1,1,12) - More AR, seasonal diff
- SARIMAX(1,0,0)(1,0,0,12) - Fallback seasonal AR

---

## 🗄️ Database Schema

### Table: `arima_forecasts`

```sql
CREATE TABLE arima_forecasts (
  id SERIAL PRIMARY KEY,
  barangay VARCHAR(100) NOT NULL,
  forecast_month DATE NOT NULL,
  predicted_cases DECIMAL(10, 6) NOT NULL,
  lower_bound DECIMAL(10, 6) NOT NULL,
  upper_bound DECIMAL(10, 6) NOT NULL,
  risk_level VARCHAR(50),
  risk_flag VARCHAR(50) DEFAULT 'normal',
  model_used VARCHAR(100),
  confidence_interval INTEGER DEFAULT 95,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barangay, forecast_month)
);
```

**Indexes**:
```sql
CREATE INDEX idx_arima_forecasts_barangay ON arima_forecasts(barangay);
CREATE INDEX idx_arima_forecasts_month ON arima_forecasts(forecast_month);
CREATE INDEX idx_arima_forecasts_risk ON arima_forecasts(risk_flag);
```

---

## 📈 Data Flow

### Input: Historical Fires from PostgreSQL

```sql
SELECT 
  barangay,
  TO_CHAR(reported_at, 'YYYY-MM') as date,
  COUNT(*) as incident_count
FROM historical_fires
WHERE barangay IS NOT NULL 
  AND barangay != ''
  AND reported_at IS NOT NULL
GROUP BY barangay, TO_CHAR(reported_at, 'YYYY-MM')
ORDER BY barangay, date
```

### Processing: Square-Root Transformation

```python
# Variance stabilization
y_transformed = np.sqrt(incident_count)

# Model fitting on transformed data
model = SARIMAX(y_transformed, ...)

# Reverse transformation for forecasts
forecast_original = np.square(forecast_transformed)
```

### Output: Monthly Forecasts with Confidence Intervals

```json
{
  "barangay": "Addition Hills",
  "forecast_month": "2025-11-01",
  "predicted_cases": 1.234567,
  "lower_bound": 0.456789,
  "upper_bound": 2.012345,
  "risk_level": "High",
  "risk_flag": "monitor",
  "model_used": "SARIMAX(1,0,1)(1,0,1,12)",
  "confidence_interval": 95
}
```

---

## 🚀 Usage

### 1. Via API (Recommended)

```bash
curl -X POST https://bfp-backend.onrender.com/api/forecasts/generate-enhanced \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "forecastMonths": 12,
    "targetDate": "2025-12-01"
  }'
```

### 2. Via Node.js Service

```javascript
const enhancedForecastService = require('./services/enhancedForecastService');

const result = await enhancedForecastService.generateForecasts({
  forecastMonths: 12,
  targetDate: '2025-12-01',
  keepTempFiles: false
});

console.log(`Generated ${result.forecasts_generated} forecasts`);
console.log(`Models used:`, result.models_summary);
```

### 3. Direct Python Script (For Testing)

```bash
# Prepare input.json with historical data
python forecasting/arima_forecast_v2.py input.json output.json

# Check output.json for results
```

---

## 📊 Performance Metrics

### Model Evaluation

**AIC (Akaike Information Criterion)**:
- Lower is better
- Balances model fit vs complexity
- Used to compare models

**RMSE (Root Mean Squared Error)**:
- Measures average prediction error
- Same units as original data
- Used for model selection

**MAE (Mean Absolute Error)**:
- Average absolute prediction error
- More robust to outliers than RMSE

### Risk Classification

**Predicted Cases**:
- >= 1.0: High Risk
- >= 0.5: Medium Risk
- >= 0.2: Low-Moderate Risk
- < 0.2: Very Low Risk

**Upper Bound (Confidence Interval)**:
- >= 3.0: Critical flag
- >= 2.0: Monitor flag
- < 2.0: Normal flag

---

## 🔍 Improvements Over Original System

### Original System:
- Single ARIMA(1,0,1) model for all barangays
- No seasonal component
- No model selection
- Limited variance handling

### Enhanced System:
✅ **Automatic Model Selection** - Tests multiple models, picks best  
✅ **Seasonal Modeling** - SARIMAX captures monthly fire patterns  
✅ **Variance Stabilization** - Square-root transform improves predictions  
✅ **Robust Fallbacks** - Multiple candidates ensure forecasts succeed  
✅ **Comprehensive Metrics** - AIC, RMSE, MAE for evaluation  
✅ **Validation Testing** - Uses last 6 months for model comparison  

---

## 🛠️ Troubleshooting

### Python Dependencies

Ensure these packages are installed:
```bash
pip install pandas numpy statsmodels scikit-learn
```

### Common Issues

**1. "No module named 'statsmodels'"**
```bash
pip install statsmodels
```

**2. "Python script exited with code 1"**
- Check Python output in logs
- Verify historical data exists
- Ensure temp directory is writable

**3. "All models failed to fit"**
- Barangay may have insufficient data (< 24 months)
- Check for data quality issues
- Review error in models_summary

**4. "Forecast values seem too high/low"**
- Check square-root transformation applied correctly
- Verify confidence intervals
- Review model_used and metrics

---

## 📝 Next Steps

### Phase 1: Testing ✅
- Test enhanced forecast generation
- Compare with original system
- Validate predictions

### Phase 2: Integration
- Update frontend to show model types
- Display confidence intervals on map
- Add model performance dashboard

### Phase 3: Optimization
- Fine-tune seasonal parameters
- Add external variables (weather, events)
- Implement ensemble methods

---

## 📞 Support

For issues or questions about the enhanced forecasting system:
- Check logs in `/temp` directory
- Review models_summary in API response
- Examine Python stdout/stderr output

**Last Updated**: October 8, 2025  
**Version**: 2.0 (Enhanced ARIMA/SARIMAX)
