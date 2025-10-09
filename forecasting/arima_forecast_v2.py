# ==============================
# Enhanced SARIMAX + ARIMA Forecast System for BFP Backend
# Based on Colab experiments with improvements
# ==============================
"""
Enhanced SARIMAX/ARIMA Fire Forecasting System
- PRIORITY: SARIMAX (seasonal model) as primary approach
- FALLBACK: ARIMA only if SARIMAX fails
- Square-root transformation for variance stabilization
- Fallback mechanisms for robust forecasting
- ADF stationarity testing
- Residual diagnostics

Usage:
  python arima_forecast_v2.py <input_file> <output_file>
  
Input JSON format:
{
  "historical_data": [
    {"barangay": "Addition Hills", "date": "2010-01", "incident_count": 2},
    ...
  ],
  "forecast_months": 12,
  "target_date": "2025-12-01"
}

Output JSON format:
{
  "forecasts": [
    {
      "barangay": "Addition Hills",
      "forecast_month": "2025-11-01",
      "predicted_cases": 1.23,
      "lower_bound": 0.45,
      "upper_bound": 2.01,
      "risk_level": "High",
      "risk_flag": "monitor",
      "model_used": "SARIMAX(1,0,1)(1,0,1,12)",
      "confidence_interval": 95
    },
    ...
  ],
  "metadata": {
    "generated_at": "2025-10-08T...",
    "models_summary": {...}
  }
}
"""

import warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
import json
import sys
from datetime import datetime
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.stattools import adfuller
from sklearn.metrics import mean_absolute_error, mean_squared_error

# ==============================
# Configuration
# ==============================
BARANGAYS = [
    'Addition Hills', 'Bagong Silang', 'Barangka Drive', 'Barangka Ibaba',
    'Barangka Ilaya', 'Barangka Itaas', 'Buayang Bato', 'Burol', 'Daang Bakal',
    'Hagdan Bato Itaas', 'Hagdan Bato Libis', 'Harapin ang Bukas', 'Highway Hills',
    'Hulo', 'Mabini J. Rizal', 'Malamig', 'Mauway', 'Namayan', 'New Zaniga',
    'Old Zaniga', 'Pag-asa', 'Plainview', 'Pleasant Hills', 'Poblacion',
    'San Jose', 'Vergara', 'Wack-wack Greenhills'
]

# Model candidates to try
ARIMA_CANDIDATES = [(1,0,1), (2,0,1), (1,0,2), (1,0,0)]
SARIMAX_CANDIDATES = [
    ((1,0,1), (1,0,1,12)),
    ((1,1,1), (1,0,1,12)),
    ((2,0,1), (0,1,1,12)),
    ((1,0,0), (1,0,0,12))
]


# ==============================
# Helper Functions
# ==============================

def safe_adf_test(series):
    """Perform ADF stationarity test safely"""
    try:
        result = adfuller(series.dropna())
        return result[1]  # p-value
    except Exception:
        return np.nan


def categorize_risk(predicted_cases, upper_bound):
    """Categorize risk level based on predicted cases and confidence interval"""
    if predicted_cases >= 1:
        risk_level = "High"
    elif predicted_cases >= 0.5:
        risk_level = "Medium"
    elif predicted_cases >= 0.2:
        risk_level = "Low-Moderate"
    else:
        risk_level = "Very Low"
    
    if upper_bound >= 3:
        risk_flag = "critical"
    elif upper_bound >= 2:
        risk_flag = "monitor"
    else:
        risk_flag = "normal"
    
    return risk_level, risk_flag


def prepare_barangay_data(df, barangay_name):
    """
    Prepare time series data for a specific barangay
    - Aggregate by month
    - Fill missing months with 0
    - Apply square-root transformation
    """
    df_brg = df[df['barangay'] == barangay_name].copy()
    
    if df_brg.empty:
        return None, None
    
    # Aggregate by month and fill missing
    df_brg = (
        df_brg.groupby('date', as_index=False)['incident_count']
        .sum()
        .sort_values('date')
        .set_index('date')
    )
    
    # Create full date range from earliest to latest
    full_range = pd.date_range(
        df_brg.index.min(), 
        df_brg.index.max(), 
        freq='MS'
    )
    df_brg = df_brg.reindex(full_range, fill_value=0)
    df_brg.index.name = 'date'
    
    # Square-root transformation for variance stabilization
    y_original = df_brg['incident_count']
    y_transformed = np.sqrt(y_original)
    
    return y_original, y_transformed


def fit_best_arima(train_data):
    """Find best ARIMA model from candidates"""
    best_model = None
    best_aic = np.inf
    best_fit = None
    best_order = None
    
    for order in ARIMA_CANDIDATES:
        try:
            model = ARIMA(train_data, order=order)
            fit = model.fit()
            
            if fit.aic < best_aic:
                best_aic = fit.aic
                best_fit = fit
                best_order = order
                best_model = 'ARIMA'
        except Exception:
            continue
    
    return best_fit, best_order, best_model


def fit_best_sarimax(train_data):
    """Find best SARIMAX model from candidates"""
    best_fit = None
    best_aic = np.inf
    best_order = None
    best_seasonal = None
    errors = []
    
    for order, seasonal in SARIMAX_CANDIDATES:
        try:
            model = SARIMAX(
                train_data, 
                order=order, 
                seasonal_order=seasonal,
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            fit = model.fit(disp=False, maxiter=100)
            
            if fit.aic < best_aic:
                best_aic = fit.aic
                best_fit = fit
                best_order = order
                best_seasonal = seasonal
        except Exception as e:
            errors.append(f"{order}{seasonal}: {str(e)[:50]}")
            continue
    
    if best_fit is None and errors:
        print(f"    SARIMAX failed: {errors[0]}")
    
    return best_fit, best_order, best_seasonal


def generate_barangay_forecast(y_original, y_transformed, barangay_name, forecast_steps, target_end_date, forecast_start_date):
    """
    Generate forecast for a barangay using best model
    
    Parameters:
    - forecast_start_date: The date to start forecasting from (usually current month)
    
    Returns:
    - forecasts: list of dicts with monthly forecasts
    - model_info: dict with model selection details
    """
    
    # Check if data is sufficient
    if len(y_transformed) < 24:
        return None, {"error": "Insufficient data (< 24 months)"}
    
    # Split train/test for validation (last 6 months as test)
    train = y_transformed[:-6] if len(y_transformed) > 6 else y_transformed
    test = y_transformed[-6:] if len(y_transformed) > 6 else pd.Series()
    
    # PRIORITY: Try SARIMAX first (seasonal model - primary approach)
    sarimax_fit, sarimax_order, sarimax_seasonal = fit_best_sarimax(train)
    
    # FALLBACK: Only try ARIMA if SARIMAX fails
    arima_fit = None
    arima_order = None
    
    selected_fit = None
    model_info = {}
    
    if sarimax_fit is not None:
        # SARIMAX succeeded - use it as primary model
        selected_fit = sarimax_fit
        if len(test) > 0:
            sarimax_forecast_test = sarimax_fit.forecast(steps=len(test))
            sarimax_rmse = np.sqrt(mean_squared_error(test, sarimax_forecast_test))
            model_info = {
                "model_type": "SARIMAX",
                "order": sarimax_order,
                "seasonal_order": sarimax_seasonal,
                "aic": round(sarimax_fit.aic, 2),
                "validation_rmse": round(sarimax_rmse, 4)
            }
        else:
            model_info = {
                "model_type": "SARIMAX",
                "order": sarimax_order,
                "seasonal_order": sarimax_seasonal,
                "aic": round(sarimax_fit.aic, 2)
            }
    else:
        # SARIMAX failed - fallback to ARIMA
        print(f"⚠️  SARIMAX failed for {barangay_name}, falling back to ARIMA...")
        arima_fit, arima_order, _ = fit_best_arima(train)
        
        if arima_fit is not None:
            selected_fit = arima_fit
            if len(test) > 0:
                arima_forecast_test = arima_fit.forecast(steps=len(test))
                arima_rmse = np.sqrt(mean_squared_error(test, arima_forecast_test))
                model_info = {
                    "model_type": "ARIMA (fallback)",
                    "order": arima_order,
                    "aic": round(arima_fit.aic, 2),
                    "validation_rmse": round(arima_rmse, 4)
                }
            else:
                model_info = {
                    "model_type": "ARIMA (fallback)",
                    "order": arima_order,
                    "aic": round(arima_fit.aic, 2)
                }
        else:
            # Both models failed
            return None, {"error": "All models failed to fit"}
    
    # Retrain on full data
    try:
        if "SARIMAX" in model_info["model_type"]:
            final_model = SARIMAX(
                y_transformed,
                order=model_info["order"],
                seasonal_order=model_info["seasonal_order"],
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            final_fit = final_model.fit(disp=False, maxiter=100)
        else:
            final_model = ARIMA(y_transformed, order=model_info["order"])
            final_fit = final_model.fit()
        
        # Generate forecast
        forecast_result = final_fit.get_forecast(steps=forecast_steps)
        forecast_mean_transformed = forecast_result.predicted_mean
        forecast_ci_transformed = forecast_result.conf_int(alpha=0.05)
        
        # Reverse square-root transformation
        forecast_mean = np.square(forecast_mean_transformed)
        forecast_lower = np.square(forecast_ci_transformed.iloc[:, 0])
        forecast_upper = np.square(forecast_ci_transformed.iloc[:, 1])
        
        # Calculate how many steps ahead forecast_start_date is from last historical date
        last_date = y_original.index[-1]
        months_ahead = (forecast_start_date.year - last_date.year) * 12 + (forecast_start_date.month - last_date.month)
        
        # Create forecast dates starting from forecast_start_date
        forecast_dates = pd.date_range(
            start=forecast_start_date,
            periods=forecast_steps,
            freq='MS'
        )
        
        # Build forecast list (skip initial months if needed)
        forecasts = []
        for i, date in enumerate(forecast_dates):
            if date > target_end_date:
                break
            
            # Calculate the actual forecast index (accounting for months_ahead)
            forecast_idx = months_ahead - 1 + i
            if forecast_idx < 0 or forecast_idx >= len(forecast_mean):
                continue
            
            predicted = float(forecast_mean.iloc[forecast_idx])
            lower = float(forecast_lower.iloc[forecast_idx])
            upper = float(forecast_upper.iloc[forecast_idx])
            
            risk_level, risk_flag = categorize_risk(predicted, upper)
            
            # Format model_used string properly
            if "SARIMAX" in model_info['model_type']:
                model_str = f"SARIMAX{model_info['order']}{model_info['seasonal_order']}"
            else:
                model_str = f"{model_info['model_type']}{model_info['order']}"
            
            forecasts.append({
                "barangay": barangay_name,
                "forecast_month": date.strftime('%Y-%m-%d'),
                "predicted_cases": round(predicted, 6),
                "lower_bound": round(lower, 6),
                "upper_bound": round(upper, 6),
                "risk_level": risk_level,
                "risk_flag": risk_flag,
                "model_used": model_str,
                "confidence_interval": 95
            })
        
        # Add fitted values metrics
        fitted_transformed = final_fit.fittedvalues
        fitted = np.square(fitted_transformed)
        
        mae = float(mean_absolute_error(y_original[1:], fitted[1:]))  # Skip first value
        rmse = float(np.sqrt(mean_squared_error(y_original[1:], fitted[1:])))
        
        model_info["mae"] = round(mae, 4)
        model_info["rmse"] = round(rmse, 4)
        
        return forecasts, model_info
        
    except Exception as e:
        return None, {"error": str(e)}


# ==============================
# Main Forecasting Function
# ==============================

def main():
    if len(sys.argv) != 3:
        print("Usage: python arima_forecast_v2.py <input_file> <output_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    # Load input data
    try:
        with open(input_file, 'r') as f:
            input_data = json.load(f)
    except Exception as e:
        print(f"Error loading input file: {e}")
        sys.exit(1)
    
    # Parse parameters
    historical_data = input_data.get('historical_data', [])
    forecast_months = input_data.get('forecast_months', 12)
    target_date_str = input_data.get('target_date', '2025-12-01')
    forecast_start_str = input_data.get('forecast_start', None)
    
    target_end_date = pd.Timestamp(target_date_str)
    # Forecast start date - if not provided, use current month
    forecast_start_date = pd.Timestamp(forecast_start_str) if forecast_start_str else pd.Timestamp.now().replace(day=1)
    
    # Convert to DataFrame
    df = pd.DataFrame(historical_data)
    df['date'] = pd.to_datetime(df['date'], format='ISO8601')
    
    # Sort barangays alphabetically
    barangay_list = sorted(df['barangay'].unique())
    
    # Generate forecasts for each barangay
    all_forecasts = []
    models_summary = {}
    
    for barangay in barangay_list:
        print(f"Processing {barangay}...")
        
        y_original, y_transformed = prepare_barangay_data(df, barangay)
        
        if y_original is None:
            print(f"  ⚠️ No data for {barangay}")
            models_summary[barangay] = {"error": "No data"}
            continue
        
        forecasts, model_info = generate_barangay_forecast(
            y_original, 
            y_transformed, 
            barangay, 
            forecast_months,
            target_end_date,
            forecast_start_date
        )
        
        if forecasts is None:
            print(f"  ⚠️ Failed: {model_info.get('error', 'Unknown error')}")
            models_summary[barangay] = model_info
            continue
        
        all_forecasts.extend(forecasts)
        models_summary[barangay] = model_info
        print(f"  ✅ {model_info['model_type']}{model_info['order']} - AIC={model_info.get('aic', 'N/A')}")
    
    # Prepare output
    output_data = {
        "forecasts": all_forecasts,
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "forecast_months": forecast_months,
            "target_end_date": target_date_str,
            "total_barangays": len(barangay_list),
            "successful_forecasts": len([m for m in models_summary.values() if 'error' not in m]),
            "models_summary": models_summary
        }
    }
    
    # Write output
    try:
        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"\n✅ Forecasts written to {output_file}")
        print(f"   Total forecasts: {len(all_forecasts)}")
    except Exception as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
