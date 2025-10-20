-- =====================================================
-- VERIFICATION QUERIES FOR ARIMA FORECAST UPLOAD
-- =====================================================
-- Run these queries in pgAdmin after uploading the forecasts
-- to verify everything was uploaded correctly

-- 1. Total forecasts count
SELECT COUNT(*) as total_forecasts FROM forecasts;

-- 2. Forecasts by barangay (should show all 27 barangays)
SELECT 
    barangay_name, 
    COUNT(*) as forecast_months,
    ROUND(AVG(predicted_cases)::numeric, 2) as avg_predicted_cases,
    ROUND(MAX(predicted_cases)::numeric, 2) as max_predicted_cases
FROM forecasts 
GROUP BY barangay_name 
ORDER BY avg_predicted_cases DESC;

-- 3. Forecasts by month (should show 12 months)
SELECT 
    year,
    month,
    COUNT(*) as barangay_count,
    ROUND(AVG(predicted_cases)::numeric, 2) as avg_predicted_cases
FROM forecasts 
GROUP BY year, month 
ORDER BY year, month;

-- 4. Risk level distribution
SELECT 
    risk_level,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM forecasts))::numeric, 1) as percentage
FROM forecasts 
GROUP BY risk_level 
ORDER BY count DESC;

-- 5. High-risk predictions (for monitoring)
SELECT 
    barangay_name,
    year,
    month,
    predicted_cases,
    risk_level,
    risk_flag
FROM forecasts 
WHERE predicted_cases >= 1.0 
ORDER BY predicted_cases DESC, barangay_name, year, month;

-- 6. Date range coverage
SELECT 
    MIN(year || '-' || LPAD(month::text, 2, '0')) as from_period,
    MAX(year || '-' || LPAD(month::text, 2, '0')) as to_period,
    COUNT(DISTINCT barangay_name) as unique_barangays
FROM forecasts;