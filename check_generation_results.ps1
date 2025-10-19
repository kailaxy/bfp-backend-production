# Check if forecast generation actually worked
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Checking Forecast Generation Results ===" -ForegroundColor Cyan
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

# Check forecasts table
Write-Host "1. Forecasts Table:" -ForegroundColor Yellow
$forecasts = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/arima/all" -Method GET -Headers $headers
Write-Host "   Count: $($forecasts.forecasts.Count)" -ForegroundColor White
if ($forecasts.forecasts.Count -gt 0) {
    Write-Host "   OK Forecasts generated!" -ForegroundColor Green
    $sample = $forecasts.forecasts[0]
    Write-Host "   Sample: $($sample.barangay) - $($sample.forecast_month)" -ForegroundColor Gray
} else {
    Write-Host "   WARNING: No forecasts found" -ForegroundColor Yellow
}
Write-Host ""

# Check graph data
Write-Host "2. Graph Data Table:" -ForegroundColor Yellow
try {
    $graphData = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Addition%20Hills" -Method GET -Headers $headers
    Write-Host "   Total Records: $($graphData.metadata.total_records)" -ForegroundColor White
    Write-Host "   Date Range: $($graphData.metadata.date_range.start) to $($graphData.metadata.date_range.end)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Dataset Counts:" -ForegroundColor White
    Write-Host "      Actual: $($graphData.metadata.datasets.actual)" -ForegroundColor Gray
    Write-Host "      Fitted: $($graphData.metadata.datasets.fitted)" -ForegroundColor Gray
    Write-Host "      Forecast: $($graphData.metadata.datasets.forecast)" -ForegroundColor Gray
    Write-Host "      CI Lower: $($graphData.metadata.datasets.ci_lower)" -ForegroundColor Gray
    Write-Host "      CI Upper: $($graphData.metadata.datasets.ci_upper)" -ForegroundColor Gray
    Write-Host "      Moving Avg: $($graphData.metadata.datasets.moving_avg_6)" -ForegroundColor Gray
    
    if ($graphData.metadata.total_records -gt 0) {
        Write-Host ""
        Write-Host "   OK Graph data available!" -ForegroundColor Green
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Check Complete ===" -ForegroundColor Cyan
Write-Host ""
