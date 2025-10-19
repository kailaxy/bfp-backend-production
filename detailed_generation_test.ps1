# Trigger generation with more logging
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Testing Forecast Generation with Detailed Logging ===" -ForegroundColor Cyan
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "Triggering forecast generation..." -ForegroundColor Yellow
Write-Host "(This will take 2-3 minutes if Python script runs properly)" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/generate-enhanced" -Method POST -Headers $headers -TimeoutSec 300
    
    $duration = ((Get-Date) - $startTime).TotalMinutes
    
    Write-Host ""
    Write-Host "=== GENERATION RESPONSE ===" -ForegroundColor Cyan
    Write-Host "Status: $($response.success)" -ForegroundColor $(if ($response.success) { "Green" } else { "Red" })
    Write-Host "Message: $($response.message)" -ForegroundColor White
    Write-Host "Successful forecasts: $($response.successful_forecasts)" -ForegroundColor White
    Write-Host "Failed forecasts: $($response.failed_forecasts)" -ForegroundColor White
    Write-Host "Actual Duration: $([math]::Round($duration, 1)) minutes" -ForegroundColor White
    
    if ($response.errors -and $response.errors.Count -gt 0) {
        Write-Host ""
        Write-Host "ERRORS:" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    }
    
    if ($response.warnings -and $response.warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "WARNINGS:" -ForegroundColor Yellow
        $response.warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
    
    Write-Host ""
    Write-Host "ANALYSIS:" -ForegroundColor Cyan
    if ($duration -lt 1) {
        Write-Host "  Duration too short! Python script may not be running." -ForegroundColor Red
        Write-Host "  Expected: 2-3 minutes for 27 barangays" -ForegroundColor Yellow
        Write-Host "  Actual: $([math]::Round($duration, 1)) minutes" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Possible causes:" -ForegroundColor Yellow
        Write-Host "    1. Python environment not configured on Railway" -ForegroundColor Gray
        Write-Host "    2. arima_forecast_v2.py not found or failing" -ForegroundColor Gray
        Write-Host "    3. Database write permissions issue" -ForegroundColor Gray
        Write-Host "    4. Child process spawn failing silently" -ForegroundColor Gray
    } else {
        Write-Host "  Duration looks normal" -ForegroundColor Green
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Now Check Railway Logs ===" -ForegroundColor Cyan
Write-Host "Go to: https://railway.app/project/<project-id>/service/<service-id>/logs" -ForegroundColor White
Write-Host "Look for:" -ForegroundColor Yellow
Write-Host "  - 'Starting forecast generation'" -ForegroundColor Gray
Write-Host "  - 'Spawning Python process'" -ForegroundColor Gray
Write-Host "  - 'Fetched X barangay-month records'" -ForegroundColor Gray
Write-Host "  - 'Processing <barangay>...'" -ForegroundColor Gray
Write-Host "  - Any database write errors" -ForegroundColor Gray
Write-Host ""
