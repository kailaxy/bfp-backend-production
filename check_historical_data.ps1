# Check if there's historical fire data to generate forecasts from
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Checking Historical Fire Data ===" -ForegroundColor Cyan
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

# Check historical fires count
Write-Host "1. Historical Fires Table:" -ForegroundColor Yellow
try {
    $historicalFires = Invoke-RestMethod -Uri "$baseUrl/api/historical-fires" -Method GET -Headers $headers
    $count = if ($historicalFires.data) { $historicalFires.data.Count } elseif ($historicalFires.fires) { $historicalFires.fires.Count } else { 0 }
    
    Write-Host "   Total Records: $count" -ForegroundColor White
    
    if ($count -eq 0) {
        Write-Host ""
        Write-Host "   PROBLEM FOUND: No historical fire data!" -ForegroundColor Red
        Write-Host "   This explains why forecast generation is fast (0.4 min)" -ForegroundColor Yellow
        Write-Host "   Without historical data, there's nothing to forecast from!" -ForegroundColor Yellow
    } else {
        Write-Host "   OK Historical data exists" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Sample record:" -ForegroundColor Gray
        $sample = if ($historicalFires.data) { $historicalFires.data[0] } else { $historicalFires.fires[0] }
        Write-Host "   Barangay: $($sample.barangay)" -ForegroundColor Gray
        Write-Host "   Date: $($sample.date_time)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check active fires for comparison
Write-Host "2. Active Fires Table:" -ForegroundColor Yellow
try {
    $activeFires = Invoke-RestMethod -Uri "$baseUrl/api/active-fires" -Method GET -Headers $headers
    $count = if ($activeFires.data) { $activeFires.data.Count } elseif ($activeFires.fires) { $activeFires.fires.Count } else { 0 }
    Write-Host "   Total Records: $count" -ForegroundColor White
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check barangays
Write-Host "3. Barangays Table:" -ForegroundColor Yellow
try {
    $barangays = Invoke-RestMethod -Uri "$baseUrl/api/barangays" -Method GET -Headers $headers
    $count = $barangays.data.Count
    Write-Host "   Total Barangays: $count" -ForegroundColor White
    if ($count -eq 27) {
        Write-Host "   OK All 27 barangays present" -ForegroundColor Green
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Analysis ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If historical_fires table is empty:" -ForegroundColor Yellow
Write-Host "  - Forecast generation has no data to process" -ForegroundColor Gray
Write-Host "  - Python script will complete quickly (~0.4 min)" -ForegroundColor Gray
Write-Host "  - No forecasts will be generated (0 records)" -ForegroundColor Gray
Write-Host "  - This is expected behavior, not a bug!" -ForegroundColor Green
Write-Host ""
Write-Host "Solution:" -ForegroundColor Yellow
Write-Host "  1. Import historical fire data into historical_fires table" -ForegroundColor Gray
Write-Host "  2. Ensure data has barangay names and dates" -ForegroundColor Gray
Write-Host "  3. Then re-run forecast generation" -ForegroundColor Gray
Write-Host ""
