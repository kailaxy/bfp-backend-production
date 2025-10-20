# 🧹 Forecasting Folder Cleanup Plan

## Current Status

### Python Files Found:
1. ✅ **`arima_forecast_12months.py`** - **KEEP - ACTIVE USE**
   - Used by: `multi12MonthForecastingService.js`
   - Route: `POST /api/forecasts/generate-12months`
   - Methodology: ✅ 3-phase ARIMA/SARIMAX selection, log1p/expm1, matches Colab
   - Status: **THIS IS THE CORRECT ONE**

2. ❌ **`arima_forecast.py`** - **DELETE - OUTDATED**
   - Used by: `forecastingService.js` (single month generation)
   - Route: `POST /api/forecasts/generate/:year/:month` (admin only)
   - Status: OLD methodology, not updated with Colab approach
   - Issue: Does NOT use log transformation or 3-phase selection

3. ⚠️ **`arima_forecast_v2.py`** - **DELETE OR KEEP AS REFERENCE**
   - Used by: `enhancedForecastService.js`
   - Route: `POST /api/forecasts/enhanced/generate`
   - Status: Enhanced version but uses SQRT transformation (not log1p)
   - Issue: Different from Colab methodology (uses sqrt instead of log)
   - Decision: DELETE (not matching Colab methodology)

4. ✅ **`barangay_models.py`** - **KEEP - CONFIGURATION**
   - Used by: `arima_forecast_12months.py`
   - Contains: Fixed SARIMAX orders per barangay from Colab
   - Status: Required for accurate forecasting

### Supporting Files:
- ✅ **`requirements.txt`** - KEEP
- ✅ **`README.md`** - KEEP
- ✅ **`README_ENHANCED.md`** - DELETE (refers to v2)
- ✅ **JSON test files** - MOVE to archive

---

## 🎯 Action Plan

### Step 1: Create Archive Folder
Move old files to `forecasting/archive/` for backup

### Step 2: Delete Unused Python Files
- ❌ Delete `arima_forecast.py`
- ❌ Delete `arima_forecast_v2.py`
- ❌ Delete `README_ENHANCED.md`

### Step 3: Update Services to Use Only arima_forecast_12months.py
- Update `forecastingService.js` to use `arima_forecast_12months.py`
- Update `schedulerService.js` to use `arima_forecast_12months.py`
- Remove references to `arima_forecast_v2.py` in `enhancedForecastService.js`

### Step 4: Clean Up Routes
- Remove enhanced forecast route (uses v2)
- Keep only the 12-month generation route

### Step 5: Update Documentation
- Update README.md to reflect current structure
- Document that system uses Colab-matched methodology

---

## 🔍 Service Usage Analysis

### Current Routes:
1. ✅ **`POST /api/forecasts/generate-12months`** - KEEP
   - Service: `multi12MonthForecastingService.js`
   - Python: `arima_forecast_12months.py` ✅
   - Status: **PRIMARY ROUTE - CORRECT METHODOLOGY**

2. ⚠️ **`POST /api/forecasts/generate/:year/:month`** - UPDATE
   - Service: `forecastingService.js`
   - Python: `arima_forecast.py` ❌
   - Action: Update to use `arima_forecast_12months.py`

3. ❌ **`POST /api/forecasts/enhanced/generate`** - DELETE
   - Service: `enhancedForecastService.js`
   - Python: `arima_forecast_v2.py` ❌
   - Action: Remove route and service

---

## ✅ Final Structure

After cleanup, `forecasting/` will contain:
```
forecasting/
├── arima_forecast_12months.py  ✅ MAIN SCRIPT (Colab methodology)
├── barangay_models.py          ✅ CONFIGURATION
├── requirements.txt             ✅ DEPENDENCIES
├── README.md                    ✅ DOCUMENTATION
└── archive/                     📦 BACKUP
    ├── arima_forecast.py
    ├── arima_forecast_v2.py
    ├── README_ENHANCED.md
    └── test files...
```

---

## 🎓 Why This Cleanup Matters

1. **Eliminates Confusion**: Only one Python script for forecasting
2. **Ensures Consistency**: All forecasts use Colab methodology
3. **Reduces Maintenance**: Single source of truth
4. **Prevents Errors**: No risk of calling wrong script
5. **Matches Presentation**: Production uses same method as research

---

## ⚠️ Before Deletion Checklist

- [x] Identify all Python files
- [x] Map service usage
- [x] Identify correct methodology
- [ ] Create archive backup
- [ ] Delete unused files
- [ ] Update service references
- [ ] Test forecast generation
- [ ] Commit changes

---

Ready to proceed with cleanup! 🧹
