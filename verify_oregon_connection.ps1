# Verify Railway is now connected to Oregon database
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Verifying Database Connection Change ===" -ForegroundColor Cyan
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "Step 1: Check table counts (should now have data)" -ForegroundColor Yellow
Write-Host ""

$tables = @{
    "Barangays" = "/api/barangays"
    "Fire Stations" = "/api/firestation"
    "Hydrants" = "/api/hydrants"
    "Notifications" = "/api/notifications"
}

$hasData = $false
foreach ($table in $tables.Keys) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl$($tables[$table])" -Method GET -Headers $headers -ErrorAction Stop
        $count = if ($response -is [Array]) { $response.Count } else { 0 }
        Write-Host "  $table`: $count records" -ForegroundColor $(if ($count -gt 0) { "Green" } else { "Yellow" })
        if ($count -gt 0) { $hasData = $true }
    } catch {
        Write-Host "  $table`: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
if ($hasData) {
    Write-Host "SUCCESS Railway is now connected to Oregon database!" -ForegroundColor Green
} else {
    Write-Host "WARNING Still showing 0 records - Railway may still be restarting..." -ForegroundColor Yellow
    Write-Host "Wait 30 seconds and try again" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 2: Now trigger forecast generation" -ForegroundColor Yellow
Write-Host "(This should take 2-3 minutes with 1,299 historical records)" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Start forecast generation? (y/n)"
if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    Write-Host ""
    Write-Host "Starting forecast generation..." -ForegroundColor Cyan
    $startTime = Get-Date
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/generate-enhanced" -Method POST -Headers $headers -TimeoutSec 300
        $duration = ((Get-Date) - $startTime).TotalMinutes
        
        Write-Host ""
        Write-Host "=== GENERATION COMPLETE ===" -ForegroundColor Green
        Write-Host "Success: $($response.success)" -ForegroundColor White
        Write-Host "Successful forecasts: $($response.successful_forecasts)" -ForegroundColor White
        Write-Host "Failed forecasts: $($response.failed_forecasts)" -ForegroundColor White
        Write-Host "Duration: $([math]::Round($duration, 1)) minutes" -ForegroundColor White
        
        Write-Host ""
        if ($duration -ge 1.5) {
            Write-Host "EXCELLENT Duration indicates real processing happened!" -ForegroundColor Green
        } else {
            Write-Host "WARNING Still too fast - may not have processed data" -ForegroundColor Yellow
        }
        
        if ($response.warnings -and $response.warnings.Count -gt 0) {
            Write-Host ""
            Write-Host "Warnings:" -ForegroundColor Yellow
            $response.warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        }
        
        # Check if forecasts were actually stored
        Write-Host ""
        Write-Host "Step 3: Verify forecasts were stored" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        
        $forecasts = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/arima/all" -Method GET -Headers $headers
        Write-Host "  Forecast count: $($forecasts.forecasts.Count)" -ForegroundColor $(if ($forecasts.forecasts.Count -gt 0) { "Green" } else { "Red" })
        
        if ($forecasts.forecasts.Count -gt 0) {
            Write-Host ""
            Write-Host "SUCCESS Forecasts generated and stored!" -ForegroundColor Green
            $sample = $forecasts.forecasts[0]
            Write-Host "  Sample: $($sample.barangay) - $($sample.forecast_month) - $($sample.predicted_cases) cases" -ForegroundColor Gray
        } else {
            Write-Host "  FAILED No forecasts stored" -ForegroundColor Red
        }
        
    } catch {
        Write-Host ""
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Skipped - run .\regenerate_forecasts.ps1 when ready" -ForegroundColor Gray
}

Write-Host ""
