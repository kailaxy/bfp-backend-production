# ==============================
# ARIMA + SARIMA Forecast per Barangay — Adapted for BFP Backend
# ==============================
"""
ARIMA-based Fire Forecasting System
Processes historical fire data and generates monthly predictions

Usage:
  python arima_forecast.py <input_file> <output_file>
  
Arguments:
  input_file: JSON file containing historical data and forecast parameters
  output_file: JSON file where forecast results will be written
"""
import warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
import json
import sys
import os
from datetime import datetime, timedelta
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX

def parse_to_month(x):
    """Parse date string to monthly timestamp"""
    try:
        return pd.Period(str(x), freq='M').to_timestamp()
    except Exception:
        dt = pd.to_datetime(str(x), errors='coerce')
        if pd.isna(dt):
            return pd.NaT
        return dt.to_period('M').to_timestamp()

def categorize_risk(predicted_cases, lower_bound, upper_bound):
    """Categorize risk level and flag based on predicted cases and upper bound"""
    # Risk level based on predicted_cases
    if predicted_cases >= 1:
        risk_level = "High"
    elif predicted_cases >= 0.5:
        risk_level = "Medium"
    elif predicted_cases >= 0.2:
        risk_level = "Low-Moderate"
    else:
        risk_level = "Very Low"
    
    # Risk flag based on upper_bound confidence interval
    if upper_bound >= 3:
        risk_flag = "Elevated Risk"
    elif upper_bound >= 2:
        risk_flag = "Watchlist"
    else:
        risk_flag = None
    
    return risk_level, risk_flag

def forecast_barangay_fires(historical_data, target_year, target_month):
    """
    Generate ARIMA forecasts for fire incidents per barangay
    
    Args:
        historical_data: List of dicts with keys: barangay, date, incident_count
        target_year: Year to forecast (e.g., 2025)
        target_month: Month to forecast (1-12)
    
    Returns:
        List of forecast results per barangay
    """
    # Convert to DataFrame
    df = pd.DataFrame(historical_data)
    df['DATE_TS'] = df['date'].apply(parse_to_month)
    df = df.dropna(subset=['DATE_TS'])
    
    # Target period setup
    target_period = pd.Period(f'{target_year}-{target_month:02d}', freq='M')
    target_ts = target_period.to_timestamp()
    
    results = []
    
    for barangay, g in df.groupby('barangay'):
        # Prepare time series
        s = g.sort_values('DATE_TS').set_index('DATE_TS')['incident_count'].astype(float)
        full_index = pd.date_range(start=s.index.min(), end=s.index.max(), freq='MS')
        s = s.reindex(full_index, fill_value=0).astype(float)
        s.index.freq = 'MS'
        
        last_period = pd.Period(s.index.max(), freq='M')
        steps = int((target_period - last_period).n)
        
        forecast_series = pd.Series(dtype=float)
        forecast_ci = pd.DataFrame()
        oct_val, oct_low, oct_high = np.nan, np.nan, np.nan
        
        if steps <= 0:
            # Target month is in historical data
            oct_val = float(s[target_ts]) if target_ts in s.index else np.nan
            oct_low, oct_high = oct_val, oct_val
        else:
            nonzero_counts = (s != 0).sum()
            
            if len(s) < 6 or nonzero_counts < 3:
                # Insufficient data - use fallback average
                fallback = s.mean()
                forecast_index = pd.date_range(
                    start=s.index.max() + pd.offsets.MonthBegin(),
                    periods=steps, freq='MS'
                )
                forecast_series = pd.Series(np.repeat(fallback, steps), index=forecast_index)
                forecast_ci = pd.DataFrame({
                    'lower': forecast_series - s.std(),
                    'upper': forecast_series + s.std()
                }, index=forecast_index)
            else:
                # Try ARIMA/SARIMA modeling
                fit = None
                try:
                    model = ARIMA(s, order=(1,1,1),
                                enforce_stationarity=False,
                                enforce_invertibility=False)
                    fit = model.fit()
                except Exception:
                    try:
                        model = SARIMAX(s, order=(1,1,1), seasonal_order=(1,1,1,12),
                                      enforce_stationarity=False,
                                      enforce_invertibility=False)
                        fit = model.fit(disp=False)
                    except Exception:
                        pass
                
                if fit is not None:
                    fc_obj = fit.get_forecast(steps=steps)
                    fc = fc_obj.predicted_mean
                    forecast_index = pd.date_range(
                        start=s.index.max() + pd.offsets.MonthBegin(),
                        periods=steps, freq='MS'
                    )
                    forecast_series = pd.Series(fc.values, index=forecast_index)
                    
                    # 95% Confidence Interval
                    ci = fc_obj.conf_int(alpha=0.05)
                    ci.index = forecast_index
                    ci.columns = ['lower', 'upper']
                    forecast_ci = ci
                else:
                    # Fallback to average
                    fallback = s.mean()
                    forecast_index = pd.date_range(
                        start=s.index.max() + pd.offsets.MonthBegin(),
                        periods=steps, freq='MS'
                    )
                    forecast_series = pd.Series(np.repeat(fallback, steps), index=forecast_index)
                    forecast_ci = pd.DataFrame({
                        'lower': forecast_series - s.std(),
                        'upper': forecast_series + s.std()
                    }, index=forecast_index)
            
            # Extract target month values
            if target_ts in forecast_series.index:
                oct_val = forecast_series.loc[target_ts]
                oct_low = forecast_ci.loc[target_ts, 'lower']
                oct_high = forecast_ci.loc[target_ts, 'upper']
        
        # Ensure non-negative values
        oct_val = max(0, float(oct_val)) if not np.isnan(oct_val) else 0
        oct_low = max(0, float(oct_low)) if not np.isnan(oct_low) else 0
        oct_high = max(0, float(oct_high)) if not np.isnan(oct_high) else 0
        
        # Categorize risk
        risk_level, risk_flag = categorize_risk(oct_val, oct_low, oct_high)
        
        results.append({
            'barangay_name': barangay,
            'month': target_month,
            'year': target_year,
            'predicted_cases': round(oct_val, 3),
            'lower_bound': round(oct_low, 3),
            'upper_bound': round(oct_high, 3),
            'risk_level': risk_level,
            'risk_flag': risk_flag
        })
    
    return results

def main():
    """Main function for command line execution"""
    # Check for new format (input_file output_file) or old format (data_file year month)
    if len(sys.argv) == 3:
        # New format: python arima_forecast.py input_file output_file
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        
        try:
            # Load input data
            with open(input_file, 'r') as f:
                input_data = json.load(f)
            
            historical_data = input_data['historical_data']
            target_year = input_data['target_year']
            target_month = input_data['target_month']
            
            print(f"Processing forecasts for {target_year}-{target_month:02d}")
            print(f"Historical data for {len(historical_data)} barangays loaded")
            
            # Generate forecasts
            forecasts = forecast_barangay_fires(historical_data, target_year, target_month)
            
            # Prepare output
            output_data = {
                'forecasts': forecasts,
                'target_year': target_year,
                'target_month': target_month,
                'generated_at': datetime.now().isoformat(),
                'total_barangays': len(forecasts)
            }
            
            # Write output file
            with open(output_file, 'w') as f:
                json.dump(output_data, f, indent=2)
            
            print(f"Forecasts generated successfully: {len(forecasts)} barangays")
            print(f"Output written to: {output_file}")
            
        except Exception as e:
            print(f"Error: {str(e)}")
            sys.exit(1)
            
    elif len(sys.argv) == 4:
        # Old format: python arima_forecast.py data_file.json target_year target_month
        data_file = sys.argv[1]
        target_year = int(sys.argv[2])
        target_month = int(sys.argv[3])
        
        # Load historical data
        with open(data_file, 'r') as f:
            historical_data = json.load(f)
        
        # Generate forecasts
        results = forecast_barangay_fires(historical_data, target_year, target_month)
        
        # Output results as JSON to stdout
        print(json.dumps(results, indent=2))
        
    else:
        print("Usage:")
        print("  New format: python arima_forecast.py <input_file> <output_file>")
        print("  Old format: python arima_forecast.py <data_file.json> <target_year> <target_month>")
        sys.exit(1)

if __name__ == "__main__":
    main()