# Check what data the forecast service actually sees
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Checking Forecast Service Data Access ===" -ForegroundColor Cyan
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "Expected: 1,299 records in historical_fires table" -ForegroundColor Yellow
Write-Host ""

# Check if there's a debug endpoint that shows what data is fetched
Write-Host "Step 1: Check database connection info" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "  Database Connected: $($health.db.connected)" -ForegroundColor White
    Write-Host "  PostGIS Version: $($health.postgis)" -ForegroundColor Gray
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 2: Check graph data count (known to work)" -ForegroundColor Cyan
try {
    $graphData = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Addition%20Hills" -Method GET -Headers $headers
    Write-Host "  Graph Records: $($graphData.metadata.total_records)" -ForegroundColor White
    Write-Host "  (This proves backend IS connected to Render database)" -ForegroundColor Gray
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 3: Trigger forecast generation and watch output" -ForegroundColor Cyan
Write-Host "  (Look for 'Fetched X barangay-month records' message)" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
try {
    Write-Host "  Starting generation..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/generate-enhanced" -Method POST -Headers $headers -TimeoutSec 300
    $duration = ((Get-Date) - $startTime).TotalMinutes
    
    Write-Host ""
    Write-Host "  Result:" -ForegroundColor White
    Write-Host "    Success: $($response.success)" -ForegroundColor $(if ($response.success) { "Green" } else { "Red" })
    Write-Host "    Successful forecasts: $($response.successful_forecasts)" -ForegroundColor White
    Write-Host "    Duration: $([math]::Round($duration, 1)) minutes" -ForegroundColor White
    
    if ($response.message) {
        Write-Host "    Message: $($response.message)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== ANALYSIS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If generation is still fast (<1 min) even with 1,299 records:" -ForegroundColor Yellow
Write-Host "  CAUSE: Python script may not be receiving the data" -ForegroundColor White
Write-Host ""
Write-Host "Possible issues:" -ForegroundColor Yellow
Write-Host "  1. fetchHistoricalData() query returns 0 rows" -ForegroundColor Gray
Write-Host "     - Column name mismatch (reported_at vs fire_date?)" -ForegroundColor Gray
Write-Host "  2. Python script receives empty data" -ForegroundColor Gray
Write-Host "  3. Input JSON file not being created properly" -ForegroundColor Gray
Write-Host ""
Write-Host "Next step: Check Railway logs at:" -ForegroundColor Yellow
Write-Host "  https://railway.app" -ForegroundColor White
Write-Host "  Look for: '📊 Fetched X barangay-month records'" -ForegroundColor Gray
Write-Host "  Should show: '📊 Fetched ~1000+ barangay-month records'" -ForegroundColor Green
Write-Host "  If shows: '📊 Fetched 0 barangay-month records'" -ForegroundColor Red
Write-Host "    -> Column name issue in query" -ForegroundColor Red
Write-Host ""
