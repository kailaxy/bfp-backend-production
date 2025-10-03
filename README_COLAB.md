# BFP ARIMA Fire Forecasting for Google Colab

This package contains everything you need to run the BFP fire forecasting system in Google Colab for your research presentation.

## Files Included

### 1. `arima_historical_data.csv` (955 rows)
- **Description**: Processed historical fire incident data from BFP Mandaluyong (2010-2024)
- **Format**: CSV with columns: `barangay,date,incident_count`
- **Data**: 954 monthly aggregated records covering 27 barangays over 15 years
- **Sample data**:
  ```
  barangay,date,incident_count
  Addition Hills,2010-05,1
  Addition Hills,2010-10,1
  Addition Hills,2011-01,3
  ```

### 2. `arima_colab_script.txt`
- **Description**: Complete ARIMA forecasting script optimized for Google Colab
- **Features**:
  - Data loading and preprocessing
  - ARIMA/SARIMA model implementation
  - Risk categorization system
  - Data visualization plots
  - Forecast result export
  - Scenario comparison utilities

## How to Use in Google Colab

### Step 1: Setup
1. Open Google Colab (colab.research.google.com)
2. Create a new notebook
3. Upload `arima_historical_data.csv` to Colab files

### Step 2: Install Dependencies
```python
!pip install pandas numpy statsmodels matplotlib seaborn
```

### Step 3: Copy Script
1. Copy the entire content from `arima_colab_script.txt`
2. Paste it into a Colab cell
3. Run the cell

### Step 4: Configure Forecast
Modify these variables in the script:
```python
TARGET_YEAR = 2025    # Year to forecast
TARGET_MONTH = 10     # Month to forecast (1-12)
DATA_FILE = 'arima_historical_data.csv'  # Uploaded data file
```

### Step 5: Run Analysis
The script will automatically:
- Load and analyze historical data
- Generate trend visualizations
- Create ARIMA forecasts for all 27 barangays
- Display results with risk categorization
- Export results to CSV

## Expected Output

### Forecast Results Table
```
barangay_name       predicted_cases  risk_level     lower_bound  upper_bound
Addition Hills      1.104           High           0.000        3.519
Plainview          0.697           Medium         0.000        3.294
Highway Hills      0.485           Low-Moderate   0.000        2.528
...
```

### Risk Level Distribution
- **High**: 1 barangay (Addition Hills)
- **Medium**: 1 barangay (Plainview)
- **Low-Moderate**: 6 barangays
- **Very Low**: 19 barangays

### Visualizations
1. Historical trend analysis
2. Seasonal patterns
3. Top barangays by incidents
4. Forecast results charts
5. Risk level distribution

## Data Statistics

- **Total Records**: 1,299 fire incidents
- **Barangays Covered**: 27 (all official Mandaluyong barangays)
- **Time Period**: January 2010 - December 2024
- **Monthly Aggregations**: 954 barangay-month combinations
- **Data Completeness**: 99.8% of original BFP records

## Research Features

### Algorithm Configuration
- **Model**: ARIMA(1,1,1) with SARIMA(1,1,1,12) fallback
- **Confidence Interval**: 95%
- **Seasonality**: 12-month cycle detection
- **Fallback**: Historical average for insufficient data

### Risk Categorization
- **High**: ≥1.0 predicted incidents
- **Medium**: 0.5-0.99 predicted incidents  
- **Low-Moderate**: 0.2-0.49 predicted incidents
- **Very Low**: <0.2 predicted incidents

### Risk Flags
- **Elevated Risk**: Upper bound ≥3 incidents
- **Watchlist**: Upper bound ≥2 incidents

## Additional Utilities

The script includes functions for:
- Scenario comparison across multiple months
- Custom visualization generation
- Data export in various formats
- Statistical analysis summaries

## Troubleshooting

### Common Issues
1. **File not found**: Ensure `arima_historical_data.csv` is uploaded to Colab
2. **Import errors**: Run the pip install command first
3. **Memory issues**: Restart runtime if needed

### Support
- All data is pre-processed and ready for use
- Script includes error handling and fallbacks
- Results match the original BFP system algorithm

## Research Citation

This ARIMA implementation processes real BFP Mandaluyong historical fire data (2010-2024) using established time series forecasting methods suitable for academic research and fire safety planning.

---

**Ready for your research presentation!** 🔥📊