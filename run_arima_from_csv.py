"""
ARIMA Forecasting Script using CSV Historical Data
Matches the Colab methodology exactly
"""

import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
import json
import sys
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

def load_historical_data(csv_path):
    """Load historical data from CSV file"""
    df = pd.read_csv(csv_path)
    
    # Convert DATE_PERIOD to datetime
    df['date'] = pd.to_datetime(df['DATE_PERIOD'], format='%Y-%m')
    df['month'] = df['date'].dt.month
    df['year'] = df['date'].dt.year
    
    return df

def prepare_time_series(df, barangay_name):
    """Prepare complete monthly time series for a barangay"""
    # Filter for specific barangay
    barangay_data = df[df['BARANGAY'] == barangay_name].copy()
    
    if len(barangay_data) == 0:
        return None
    
    # Get date range
    min_date = barangay_data['date'].min()
    max_date = barangay_data['date'].max()
    
    # Create complete date range
    date_range = pd.date_range(start=min_date, end=max_date, freq='MS')
    
    # Create complete series with zeros for missing months
    complete_series = pd.Series(0, index=date_range)
    
    # Fill in actual incident counts
    for _, row in barangay_data.iterrows():
        complete_series[row['date']] = row['INCIDENT_COUNT']
    
    return complete_series

def forecast_barangay_12months(df, barangay_name, forecast_months=15):
    """
    Forecast fire incidents using 3-phase ARIMA/SARIMAX selection
    Matches Colab methodology exactly
    """
    # Prepare time series
    series = prepare_time_series(df, barangay_name)
    
    if series is None or len(series) < 24:
        print(f"⚠️ Insufficient data for {barangay_name}: {len(series) if series is not None else 0} months")
        return None
    
    print(f"\n{'='*60}")
    print(f"[*] Forecasting: {barangay_name}")
    print(f"{'='*60}")
    print(f"Historical data: {len(series)} months ({series.index[0].strftime('%Y-%m')} to {series.index[-1].strftime('%Y-%m')})")
    print(f"Total incidents: {series.sum():.0f}, Mean: {series.mean():.2f}, Std: {series.std():.2f}")
    
    # Log transformation
    y = np.log1p(series.values)
    
    # Phase 1: Test ARIMA candidates
    print("\n[Phase 1] Testing ARIMA candidates...")
    arima_candidates = [(1,0,1), (2,0,1), (1,0,2)]
    best_arima_aic = float('inf')
    best_arima_fit = None
    best_arima_order = None
    
    for order in arima_candidates:
        try:
            model = ARIMA(y, order=order)
            fit = model.fit()
            print(f"  ARIMA{order}: AIC={fit.aic:.2f}")
            if fit.aic < best_arima_aic:
                best_arima_aic = fit.aic
                best_arima_fit = fit
                best_arima_order = order
        except Exception as e:
            print(f"  ARIMA{order}: Failed - {str(e)[:50]}")
    
    if best_arima_fit:
        print(f"[OK] Best ARIMA: {best_arima_order} (AIC={best_arima_aic:.2f})")
    
    # Phase 2: Test SARIMAX candidates
    print("\n[Phase 2] Testing SARIMAX candidates...")
    sarimax_orders = [
        ((1,0,1), (1,0,1,12)),
        ((1,1,1), (1,0,1,12)),
        ((2,0,1), (0,1,1,12))
    ]
    
    best_sarimax_aic = float('inf')
    best_sarimax_fit = None
    best_sarimax_order = None
    
    for order, seasonal in sarimax_orders:
        try:
            model = SARIMAX(y, order=order, seasonal_order=seasonal, enforce_stationarity=False, enforce_invertibility=False)
            fit = model.fit(disp=False)
            print(f"  SARIMAX{order}x{seasonal}: AIC={fit.aic:.2f}")
            if fit.aic < best_sarimax_aic:
                best_sarimax_aic = fit.aic
                best_sarimax_fit = fit
                best_sarimax_order = (order, seasonal)
        except Exception as e:
            print(f"  SARIMAX{order}x{seasonal}: Failed - {str(e)[:50]}")
    
    if best_sarimax_fit:
        print(f"[OK] Best SARIMAX: {best_sarimax_order[0]}x{best_sarimax_order[1]} (AIC={best_sarimax_aic:.2f})")
    
    # Phase 3: Choose best overall model
    print("\n[Phase 3] Selecting best model...")
    if best_sarimax_fit and best_sarimax_aic < best_arima_aic:
        best_fit = best_sarimax_fit
        best_aic = best_sarimax_aic
        model_type = f"SARIMAX{best_sarimax_order[0]}x{best_sarimax_order[1]}"
        print(f"[SELECTED] {model_type} (AIC={best_aic:.2f})")
    elif best_arima_fit:
        best_fit = best_arima_fit
        best_aic = best_arima_aic
        model_type = f"ARIMA{best_arima_order}"
        print(f"[SELECTED] {model_type} (AIC={best_aic:.2f})")
    else:
        print("[ERROR] No valid model found!")
        return None
    
    # Generate forecasts
    print(f"\n[*] Generating {forecast_months}-month forecast...")
    forecast_obj = best_fit.get_forecast(steps=forecast_months)
    
    # Transform back from log space
    forecast_mean = np.expm1(forecast_obj.predicted_mean)
    forecast_ci = forecast_obj.conf_int(alpha=0.05)
    
    # Transform confidence intervals
    if isinstance(forecast_ci, np.ndarray):
        forecast_ci = pd.DataFrame(forecast_ci, columns=['lower', 'upper'])
    forecast_ci = np.expm1(forecast_ci)
    
    # Ensure non-negative
    forecast_mean = np.maximum(0, forecast_mean)
    forecast_ci = np.maximum(0, forecast_ci)
    
    # Generate forecast dates
    last_date = series.index[-1]
    forecast_dates = pd.date_range(start=last_date + pd.DateOffset(months=1), periods=forecast_months, freq='MS')
    
    # Create results
    results = []
    for i, date in enumerate(forecast_dates):
        predicted = float(forecast_mean[i])
        lower = float(forecast_ci.iloc[i, 0]) if hasattr(forecast_ci, 'iloc') else float(forecast_ci[i, 0])
        upper = float(forecast_ci.iloc[i, 1]) if hasattr(forecast_ci, 'iloc') else float(forecast_ci[i, 1])
        
        # Categorize risk
        if predicted >= 1.0:
            risk_level = "High"
        elif predicted >= 0.5:
            risk_level = "Medium"
        elif predicted >= 0.2:
            risk_level = "Low-Moderate"
        else:
            risk_level = "Very Low"
        
        # Risk flag
        if upper >= 3:
            risk_flag = "Elevated Risk"
        elif upper >= 2:
            risk_flag = "Watchlist"
        else:
            risk_flag = None
        
        results.append({
            'barangay': barangay_name,
            'month': date.month,
            'year': date.year,
            'date': date.strftime('%Y-%m'),
            'predicted_cases': round(predicted, 3),
            'lower_bound': round(lower, 3),
            'upper_bound': round(upper, 3),
            'risk_level': risk_level,
            'risk_flag': risk_flag,
            'model': model_type
        })
        
        print(f"  {date.strftime('%Y-%m')}: {predicted:.3f} [{lower:.3f}, {upper:.3f}] - {risk_level}")
    
    return results

def main():
    # Load CSV data
    csv_path = '../datatoforecasts.csv'
    print(f"[*] Loading data from: {csv_path}")
    
    df = load_historical_data(csv_path)
    print(f"[OK] Loaded {len(df)} records")
    
    # Get unique barangays
    barangays = sorted(df['BARANGAY'].unique())
    print(f"[*] Found {len(barangays)} barangays")
    
    # Generate forecasts for all barangays
    all_forecasts = []
    successful = 0
    failed = 0
    
    for barangay in barangays:
        try:
            forecasts = forecast_barangay_12months(df, barangay, forecast_months=15)
            if forecasts:
                all_forecasts.extend(forecasts)
                successful += 1
            else:
                failed += 1
        except Exception as e:
            print(f"\n❌ Error forecasting {barangay}: {str(e)}")
            failed += 1
    
    # Summary
    print(f"\n{'='*60}")
    print(f"[SUMMARY] FORECASTING RESULTS")
    print(f"{'='*60}")
    print(f"[OK] Successful: {successful}/{len(barangays)} barangays")
    print(f"[FAIL] Failed: {failed}/{len(barangays)} barangays")
    print(f"[*] Total forecasts generated: {len(all_forecasts)}")
    
    # Save results to CSV
    if all_forecasts:
        output_df = pd.DataFrame(all_forecasts)
        output_path = 'forecasts_from_csv.csv'
        output_df.to_csv(output_path, index=False)
        print(f"\n[SAVED] Results to: {output_path}")
        
        # Save JSON for easy import
        output_json = 'forecasts_from_csv.json'
        with open(output_json, 'w') as f:
            json.dump(all_forecasts, f, indent=2)
        print(f"[SAVED] JSON to: {output_json}")
        
        # Show sample for October 2025
        oct_2025 = output_df[(output_df['year'] == 2025) & (output_df['month'] == 10)]
        if len(oct_2025) > 0:
            print(f"\n[SAMPLE] October 2025 Forecasts")
            print(oct_2025[['barangay', 'predicted_cases', 'risk_level']].head(10).to_string(index=False))
    
    print(f"\n[DONE] Complete!")

if __name__ == '__main__':
    main()
