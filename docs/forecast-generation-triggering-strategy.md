# Forecast Generation Triggering Strategy

## Overview
The BFP Fire Risk Forecasting System uses an intelligent triggering strategy to automatically generate 12-month forecasts only when meaningful historical data is added to the system.

## Triggering Scenarios

### ✅ **TRIGGERS Forecast Generation**

#### 1. **Active Fire Resolution**
- **When**: Active fires are resolved and moved to `historical_fires` table
- **Route**: `PUT /api/active_fires/:id/resolve`
- **Rationale**: These are verified, completed fire incidents that represent real historical data
- **Implementation**: `routes/activeFires.js` → `ForecastGenerationUtils.triggerAfterFireResolution()`

#### 2. **Bulk Historical Data Import**
- **When**: Historical data is imported via scripts (CSV imports, data migrations)
- **Scripts**: `scripts/import_bfp_historical_clean.js`, etc.
- **Rationale**: Large amounts of historical data significantly impact forecast accuracy
- **Implementation**: `ForecastGenerationUtils.triggerAfterBulkImport()`

#### 3. **Manual Admin Request**
- **When**: Admin explicitly requests forecast generation
- **Route**: `POST /api/forecasts/generate-12months`
- **Rationale**: Admin control for testing, maintenance, or forced updates
- **Implementation**: Direct call to `multi12MonthForecastingService`

### ❌ **DOES NOT TRIGGER** Forecast Generation

#### 1. **Incident Reports**
- **When**: Users submit incident reports
- **Route**: `POST /api/incidents-reports`
- **Rationale**: These are user reports, not necessarily verified historical data
- **Note**: May include false reports, duplicates, or unverified incidents

#### 2. **Active Fire Creation**
- **When**: New active fires are reported
- **Route**: `POST /api/active_fires`
- **Rationale**: These are ongoing incidents, not historical data yet

## Implementation Details

### Smart Generation Checks
The system includes intelligent checks to avoid unnecessary generation:

```javascript
// Skip if forecasts were generated recently (within 30 minutes)
const shouldTrigger = await ForecastGenerationUtils.shouldTriggerGeneration({
  skipIfRecent: true,
  recentThresholdMinutes: 30
});
```

### Background Processing
All forecast generation runs asynchronously to avoid blocking primary operations:

```javascript
// Fire resolution continues immediately, forecasts generate in background
ForecastGenerationUtils.triggerAfterFireResolution(fireId)
  .catch(error => console.error('Forecast generation error:', error));
```

### Error Handling
Forecast generation failures don't impact primary operations:

```javascript
// If forecast generation fails, the fire is still properly resolved
return res.json({ 
  message: 'Fire resolved and archived.',
  forecast_generation: 'triggered'
});
```

## Usage Examples

### For Import Scripts
```javascript
// At the end of data import scripts
const ForecastGenerationUtils = require('../services/forecastGenerationUtils');

// After importing historical data
const importedCount = await importHistoricalData();
await ForecastGenerationUtils.triggerAfterBulkImport('CSV Import', importedCount);
```

### For API Routes
```javascript
// When resolving active fires
const ForecastGenerationUtils = require('../services/forecastGenerationUtils');

// After moving fire to historical_fires
await moveFireToHistorical(fireId);
ForecastGenerationUtils.triggerAfterFireResolution(fireId)
  .catch(error => console.error('Forecast error:', error));
```

### For Manual Generation
```javascript
// Admin endpoint for manual generation
const multi12MonthForecastingService = require('../services/multi12MonthForecastingService');

const results = await multi12MonthForecastingService.generateAndSave12MonthForecasts();
```

## Benefits of This Strategy

### 1. **Accuracy**
- Only triggers on verified, meaningful historical data
- Avoids noise from unverified user reports
- Ensures forecasts reflect actual incident patterns

### 2. **Performance**
- Reduces unnecessary forecast generation
- Intelligent throttling prevents excessive computation
- Background processing doesn't block user operations

### 3. **Reliability**
- Clear separation between reports and historical data
- Robust error handling prevents system disruption
- Logging provides clear audit trail

### 4. **Maintainability**
- Centralized utilities for consistent behavior
- Clear documentation of when forecasts update
- Easy to modify triggering conditions

## Monitoring

### Check Generation Status
```bash
node -e "
const utils = require('./services/forecastGenerationUtils');
utils.getGenerationStatus().then(console.log);
"
```

### View Recent Generations
```sql
SELECT MAX(created_at) as latest_generation, COUNT(*) as total_forecasts
FROM forecasts;
```

### Monitor Logs
Look for these log messages:
- `🔥 Active fire resolved and moved to historical` - Fire resolution trigger
- `📊 Bulk historical data import completed` - Import trigger  
- `✅ Forecast generation completed` - Successful generation
- `⚠️ Forecast generation failed` - Generation errors

## Configuration

### Adjust Recent Generation Threshold
```javascript
// Skip generation if forecasts were generated within X minutes
const shouldTrigger = await ForecastGenerationUtils.shouldTriggerGeneration({
  skipIfRecent: true,
  recentThresholdMinutes: 60 // Increase to 60 minutes
});
```

### Enable/Disable Auto-Generation
```javascript
// Temporarily disable auto-generation during maintenance
const ENABLE_AUTO_FORECASTS = process.env.ENABLE_AUTO_FORECASTS !== 'false';

if (ENABLE_AUTO_FORECASTS) {
  ForecastGenerationUtils.triggerAfterFireResolution(fireId);
}
```

This refined strategy ensures that forecasts are updated when it matters most - when actual historical fire data is added to the system - while avoiding unnecessary generation on user reports or unverified incidents.