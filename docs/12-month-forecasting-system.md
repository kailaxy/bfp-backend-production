# 12-Month Fire Risk Forecasting System

## Overview
The BFP Fire Risk Forecasting System now automatically generates 12 months of predictions whenever a new fire incident is reported. This ensures that the system always has up-to-date forecasts available for all barangays in Mandaluyong.

## Features

### ✅ **Automatic Generation**
- **Trigger**: Every time a new fire incident is added to `historical_fires` table
- **Coverage**: 12 months of forecasts starting from current month
- **Scope**: All 27 barangays in Mandaluyong
- **Background Process**: Runs asynchronously without blocking incident reporting

### ✅ **Frontend Month Cycling**
- **UI Controls**: "< [Month Year] >" navigation in Fire Risk Legend
- **Navigation**: Users can cycle through all 12 months of available forecasts
- **State Management**: Integrated with MapContext for seamless updates
- **Responsive Design**: Works on both desktop and mobile devices

### ✅ **Database Coverage**
```
Current Status: 324 forecasts generated
• Oct 2025 → Sep 2026 (12 months)
• 27 barangays per month
• Automatic updates on new incidents
```

## Technical Implementation

### 1. **Python ARIMA Script**
- **File**: `forecasting/arima_forecast_12months.py`
- **Algorithm**: ARIMA(1,1,1) / SARIMA(1,1,1,12)
- **Input**: Historical fire data from database
- **Output**: 12 months of predictions per barangay

### 2. **Node.js Service**
- **File**: `services/multi12MonthForecastingService.js`
- **Functions**:
  - `generate12MonthForecasts()` - Generate forecasts
  - `save12MonthForecastsToDatabase()` - Store in database
  - `triggerForecastGeneration()` - Auto-trigger on new incidents

### 3. **Database Schema**
```sql
Table: forecasts
- barangay_name (varchar)
- month (integer 1-12)
- year (integer)
- predicted_cases (decimal)
- lower_bound (decimal)
- upper_bound (decimal)
- risk_level (varchar: Very Low, Low-Moderate, Medium, High)
- risk_flag (varchar: Watchlist, Elevated Risk, null)
- created_at (timestamp)

Unique constraint: (barangay_name, month, year)
```

### 4. **API Endpoints**

#### Get Forecasts for Specific Month
```
GET /api/forecasts/:year/:month
```

#### Get Latest Available Forecasts
```
GET /api/forecasts/latest
```

#### Generate 12-Month Forecasts (Admin Only)
```
POST /api/forecasts/generate-12months
Body: { startYear: 2025, startMonth: 10 }
```

### 5. **Frontend Integration**
- **Component**: `FireRiskLegend.jsx`
- **State**: `forecastMonth` in MapContext
- **Controls**: Month navigation arrows
- **Display**: Current month/year indicator

## Risk Categories

| Predicted Cases | Risk Level | Color |
|----------------|------------|-------|
| ≥ 1.0 | High | Red |
| 0.5 - 0.99 | Medium | Orange |
| 0.2 - 0.49 | Low-Moderate | Yellow |
| < 0.2 | Very Low | Green |

## Usage Examples

### Manual Generation (Admin)
```bash
# Generate initial 12 months
node scripts/generate_initial_12month_forecasts.js

# Test automatic generation
node scripts/test_auto_forecast_generation.js
```

### API Usage
```javascript
// Frontend: Change forecast month
const changeMonth = (direction) => {
  const newMonth = direction === 'next' 
    ? (forecastMonth % 12) + 1 
    : forecastMonth === 1 ? 12 : forecastMonth - 1;
  
  setForecastMonth(newMonth);
  fetchFireRiskForecasts(newMonth);
};
```

### Database Queries
```sql
-- Get all forecasts for October 2025
SELECT * FROM forecasts WHERE year = 2025 AND month = 10;

-- Get high-risk barangays for next 3 months
SELECT * FROM forecasts 
WHERE (year = 2025 AND month >= 10) OR (year = 2026 AND month <= 1)
  AND risk_level = 'High';

-- Count forecasts by month
SELECT year, month, COUNT(*) as barangays_count 
FROM forecasts 
GROUP BY year, month 
ORDER BY year, month;
```

## Monitoring & Maintenance

### Health Checks
```bash
# Check forecast coverage
node -e "const db = require('./db'); db.query('SELECT year, month, COUNT(*) as count FROM forecasts GROUP BY year, month ORDER BY year, month').then(r => console.table(r.rows))"

# Check latest generation
node -e "const db = require('./db'); db.query('SELECT MAX(created_at) as latest_update FROM forecasts').then(r => console.log('Latest:', r.rows[0]))"
```

### Log Monitoring
- **Incident Addition**: Look for "🔥 New fire incident added" logs
- **Forecast Generation**: Look for "✅ Forecast generation completed" logs
- **Errors**: Look for "❌ Forecast generation error" logs

## Performance Considerations

- **Generation Time**: ~30-60 seconds for 12 months × 27 barangays
- **Database Impact**: 324 upsert operations per generation
- **Memory Usage**: Temporary files in `/temp/` directory (auto-cleaned)
- **Python Dependencies**: pandas, numpy, statsmodels required

## Future Enhancements

1. **Configurable Forecast Horizon**: Allow admin to set forecast period (6, 12, 18 months)
2. **Historical Accuracy Tracking**: Compare predictions vs actual incidents
3. **Seasonal Adjustments**: Enhance SARIMA parameters based on local patterns
4. **Real-time Updates**: WebSocket notifications when forecasts are updated
5. **Export Capabilities**: CSV/PDF export of forecast reports

## Troubleshooting

### Common Issues

1. **Python Dependencies Missing**:
   ```bash
   pip install pandas numpy statsmodels
   ```

2. **Database Connection Issues**:
   - Check PostgreSQL connection
   - Verify `forecasts` table exists
   - Ensure proper permissions

3. **Forecast Generation Fails**:
   - Check Python script logs
   - Verify historical data availability
   - Ensure temp directory permissions

4. **Frontend Month Navigation Not Working**:
   - Check MapContext implementation
   - Verify API endpoints returning data
   - Check browser console for errors

### Debug Commands
```bash
# Test Python script directly
py forecasting/arima_forecast_12months.py input.json output.json

# Check service health
node scripts/test_auto_forecast_generation.js

# Manually regenerate forecasts
node scripts/generate_initial_12month_forecasts.js
```