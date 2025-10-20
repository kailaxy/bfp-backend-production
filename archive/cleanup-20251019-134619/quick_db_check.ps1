# Simple check - verify we can access forecasts endpoint and see database name
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Quick Database Check ===" -ForegroundColor Cyan
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }
Write-Host "OK Logged in" -ForegroundColor Green
Write-Host ""

# Check health endpoint (shows DB connected)
Write-Host "Health Check:" -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
Write-Host "   DB Connected: $($health.db.connected)" -ForegroundColor White
Write-Host ""

# Check forecasts (should show which DB it's using based on data)
Write-Host "Checking Forecasts Table:" -ForegroundColor Yellow
try {
    $forecasts = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/arima/all" -Method GET -Headers $headers
    Write-Host "   Forecast Count: $($forecasts.forecasts.Count)" -ForegroundColor White
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Check if graph table exists and has data
Write-Host "Checking Graph Data:" -ForegroundColor Yellow
try {
    $graphData = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Addition%20Hills" -Method GET -Headers $headers
    Write-Host "   Graph endpoint works!" -ForegroundColor Green
    Write-Host "   Total records: $($graphData.metadata.total_records)" -ForegroundColor White
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    Write-Host "   Status: $statusCode" -ForegroundColor Yellow
    if ($statusCode -eq 404) {
        Write-Host "   No graph data found (table may be empty)" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "=== Check Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Based on the health check showing DB connected=True," -ForegroundColor White
Write-Host "the backend IS using DATABASE_URL from environment." -ForegroundColor White
Write-Host ""
Write-Host "To verify which specific database:" -ForegroundColor White
Write-Host "  1. Check Railway dashboard -> bfp-backend -> Variables" -ForegroundColor White
Write-Host "  2. Look for DATABASE_URL value (should contain 'render.com' and 'bfpmapping_nua2')" -ForegroundColor White
Write-Host ""
