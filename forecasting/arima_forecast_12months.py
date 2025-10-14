# ==============================
# ARIMA + SARIMA 12-Month Forecast per Barangay — BFP Backend
# ==============================
"""
ARIMA-based Fire Forecasting System - 12 Months Generation
Processes historical fire data and generates 12 months of predictions starting from current month

Usage:
  python arima_forecast_12months.py <input_file> <output_file>
  
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

# Import barangay-specific model configurations
try:
    from barangay_models import get_model_for_barangay
    USE_FIXED_MODELS = True
except ImportError:
    USE_FIXED_MODELS = False
    print("⚠️ Warning: barangay_models.py not found, using dynamic model selection")

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
    # Risk level based on predicted_cases (matching Colab thresholds)
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

def forecast_barangay_fires_12months(historical_data, start_year, start_month):
    """
    Generate ARIMA forecasts for fire incidents per barangay for 12 months
    
    Args:
        historical_data: List of dicts with keys: barangay, date, incident_count
        start_year: Starting year to forecast (e.g., 2025)
        start_month: Starting month to forecast (1-12)
    
    Returns:
        List of forecast results per barangay for 12 months
    """
    # Convert to DataFrame
    df = pd.DataFrame(historical_data)
    df['DATE_TS'] = df['date'].apply(parse_to_month)
    df = df.dropna(subset=['DATE_TS'])
    
    # Generate 12 target periods starting from the given month
    target_periods = []
    current_year = start_year
    current_month = start_month
    
    for i in range(12):
        target_periods.append((current_year, current_month))
        current_month += 1
        if current_month > 12:
            current_month = 1
            current_year += 1
    
    results = []
    
    for barangay, g in df.groupby('barangay'):
        # Prepare time series
        s = g.sort_values('DATE_TS').set_index('DATE_TS')['incident_count'].astype(float)
        full_index = pd.date_range(start=s.index.min(), end=s.index.max(), freq='MS')
        s = s.reindex(full_index, fill_value=0).astype(float)
        s.index.freq = 'MS'
        
        # Calculate steps needed from last historical data to furthest target
        last_period = pd.Period(s.index.max(), freq='M')
        furthest_target = pd.Period(f'{target_periods[-1][0]}-{target_periods[-1][1]:02d}', freq='M')
        max_steps = int((furthest_target - last_period).n)
        
        # Ensure we have at least some steps to forecast
        if max_steps <= 0:
            max_steps = 12  # Default to 12 months if calculation is invalid
        
        forecast_series = pd.Series(dtype=float)
        forecast_ci = pd.DataFrame()
        
        if max_steps <= 0:
            # All target months are in historical data or current
            print(f"Warning: {barangay} - All target months are in historical data")
            for target_year, target_month in target_periods:
                target_period = pd.Period(f'{target_year}-{target_month:02d}', freq='M')
                target_ts = target_period.to_timestamp()
                
                if target_ts in s.index:
                    predicted_val = float(s[target_ts])
                else:
                    predicted_val = s.mean()  # Fallback to average
                
                risk_level, risk_flag = categorize_risk(predicted_val, predicted_val, predicted_val)
                
                results.append({
                    'barangay_name': barangay,
                    'month': target_month,
                    'year': target_year,
                    'predicted_cases': round(predicted_val, 3),
                    'lower_bound': round(predicted_val, 3),
                    'upper_bound': round(predicted_val, 3),
                    'risk_level': risk_level,
                    'risk_flag': risk_flag,
                    'model_used': 'Historical Data'
                })
        else:
            nonzero_counts = (s != 0).sum()
            model_used = None  # Initialize model tracker
            
            if len(s) < 6 or nonzero_counts < 3:
                # Insufficient data - use fallback average
                model_used = "Mean Fallback (Insufficient Data)"
                fallback = s.mean()
                forecast_index = pd.date_range(
                    start=s.index.max() + pd.offsets.MonthBegin(),
                    periods=max_steps, freq='MS'
                )
                forecast_series = pd.Series(np.repeat(fallback, max_steps), index=forecast_index)
                forecast_ci = pd.DataFrame({
                    'lower': forecast_series - s.std(),
                    'upper': forecast_series + s.std()
                }, index=forecast_index)
            else:
                # ✅ MATCH COLAB EXACTLY: Apply log1p transformation (final export uses this!)
                y = np.log1p(s)
                
                # ===================================================
                # PHASE 1: Test ARIMA candidates (matching Colab)
                # ===================================================
                arima_candidates = [(1,0,1), (2,0,1), (1,0,2)]
                best_arima_aic = np.inf
                best_arima_fit = None
                
                for order in arima_candidates:
                    try:
                        model = ARIMA(y, order=order,
                                    enforce_stationarity=False,
                                    enforce_invertibility=False)
                        fit = model.fit()
                        if fit.aic < best_arima_aic:
                            best_arima_aic = fit.aic
                            best_arima_fit = fit
                    except Exception:
                        continue
                
                # ===================================================
                # PHASE 2: Test SARIMAX seasonal models (matching Colab)
                # Compare against ARIMA(1,0,1) baseline
                # ===================================================
                sarimax_orders = [
                    ((1,0,1), (1,0,1,12)),
                    ((1,1,1), (1,0,1,12)),
                    ((2,0,1), (0,1,1,12))
                ]
                
                best_sarimax_aic = np.inf
                best_sarimax_fit = None
                
                for order, seasonal in sarimax_orders:
                    try:
                        model = SARIMAX(y, order=order, seasonal_order=seasonal,
                                      enforce_stationarity=False,
                                      enforce_invertibility=False)
                        fit = model.fit(disp=False)
                        if fit.aic < best_sarimax_aic:
                            best_sarimax_aic = fit.aic
                            best_sarimax_fit = fit
                    except Exception:
                        continue
                
                # ===================================================
                # PHASE 3: Choose best overall model (SARIMAX preferred if available)
                # ===================================================
                model_used = None
                if best_sarimax_fit is not None:
                    best_fit = best_sarimax_fit  # Prefer SARIMAX (seasonal model)
                    # Extract model orders from the fit
                    model_spec = best_sarimax_fit.specification
                    order = model_spec['order']
                    seasonal_order = model_spec['seasonal_order']
                    model_used = f"SARIMAX{order}x{seasonal_order}"
                elif best_arima_fit is not None:
                    best_fit = best_arima_fit  # Fallback to ARIMA
                    # Extract model order from the fit
                    model_spec = best_arima_fit.specification
                    order = model_spec['order']
                    model_used = f"ARIMA{order}"
                else:
                    best_fit = None
                    model_used = "Mean Fallback"
                
                if best_fit is not None:
                    # ✅ MATCH COLAB: Get forecast and apply inverse transform (expm1)
                    fc_obj = best_fit.get_forecast(steps=max_steps)
                    fc = fc_obj.predicted_mean
                    forecast_index = pd.date_range(
                        start=s.index.max() + pd.offsets.MonthBegin(),
                        periods=max_steps, freq='MS'
                    )
                    
                    # Apply expm1 to inverse the log1p transformation
                    forecast_series = pd.Series(np.expm1(fc.values), index=forecast_index)
                    
                    # 95% Confidence Interval (also inverse transformed)
                    ci = fc_obj.conf_int(alpha=0.05)
                    ci.index = forecast_index
                    forecast_ci = pd.DataFrame({
                        'lower': np.expm1(ci.iloc[:, 0]),
                        'upper': np.expm1(ci.iloc[:, 1])
                    }, index=forecast_index)
                else:
                    # Fallback to average (no transformation needed for fallback)
                    fallback = s.mean()
                    forecast_index = pd.date_range(
                        start=s.index.max() + pd.offsets.MonthBegin(),
                        periods=max_steps, freq='MS'
                    )
                    forecast_series = pd.Series(np.repeat(fallback, max_steps), index=forecast_index)
                    forecast_ci = pd.DataFrame({
                        'lower': forecast_series - s.std(),
                        'upper': forecast_series + s.std()
                    }, index=forecast_index)
            
            # Extract values for each target month
            for target_year, target_month in target_periods:
                target_period = pd.Period(f'{target_year}-{target_month:02d}', freq='M')
                target_ts = target_period.to_timestamp()
                
                if target_ts in forecast_series.index:
                    predicted_val = forecast_series.loc[target_ts]
                    lower_val = forecast_ci.loc[target_ts, 'lower']
                    upper_val = forecast_ci.loc[target_ts, 'upper']
                else:
                    # Fallback if target not in forecast range
                    predicted_val = s.mean()
                    lower_val = predicted_val - s.std()
                    upper_val = predicted_val + s.std()
                
                # Ensure non-negative values
                predicted_val = max(0, float(predicted_val)) if not np.isnan(predicted_val) else 0
                lower_val = max(0, float(lower_val)) if not np.isnan(lower_val) else 0
                upper_val = max(0, float(upper_val)) if not np.isnan(upper_val) else 0
                
                # Categorize risk
                risk_level, risk_flag = categorize_risk(predicted_val, lower_val, upper_val)
                
                results.append({
                    'barangay_name': barangay,
                    'month': target_month,
                    'year': target_year,
                    'predicted_cases': round(predicted_val, 3),
                    'lower_bound': round(lower_val, 3),
                    'upper_bound': round(upper_val, 3),
                    'risk_level': risk_level,
                    'risk_flag': risk_flag,
                    'model_used': model_used
                })
    
    return results

def main():
    """Main function for command line execution"""
    if len(sys.argv) != 3:
        print("Usage: python arima_forecast_12months.py <input_file> <output_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    try:
        # Load input data
        with open(input_file, 'r') as f:
            input_data = json.load(f)
        
        historical_data = input_data['historical_data']
        start_year = input_data['start_year']
        start_month = input_data['start_month']
        
        print(f"Processing 12-month forecasts starting from {start_year}-{start_month:02d}")
        print(f"Historical data for {len(set(h['barangay'] for h in historical_data))} barangays loaded")
        
        # Generate 12-month forecasts
        forecasts = forecast_barangay_fires_12months(historical_data, start_year, start_month)
        
        # Group forecasts by month for output
        forecasts_by_month = {}
        for forecast in forecasts:
            month_key = f"{forecast['year']}-{forecast['month']:02d}"
            if month_key not in forecasts_by_month:
                forecasts_by_month[month_key] = []
            forecasts_by_month[month_key].append(forecast)
        
        # Prepare output
        output_data = {
            'forecasts_by_month': forecasts_by_month,
            'all_forecasts': forecasts,
            'start_year': start_year,
            'start_month': start_month,
            'generated_at': datetime.now().isoformat(),
            'total_months': 12,
            'total_predictions': len(forecasts),
            'barangays_count': len(set(f['barangay_name'] for f in forecasts))
        }
        
        # Write output file
        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        print(f"12-month forecasts generated successfully:")
        print(f"  • Total predictions: {len(forecasts)}")
        print(f"  • Barangays covered: {len(set(f['barangay_name'] for f in forecasts))}")
        print(f"  • Months covered: {len(forecasts_by_month)}")
        print(f"Output written to: {output_file}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()