# Quick verification of Oregon database connection
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Verifying Oregon Database Connection ===" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "Logging in..." -ForegroundColor Gray
try {
    $loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    $headers = @{ "Authorization" = "Bearer $token" }
    Write-Host "  Login successful!" -ForegroundColor Green
} catch {
    Write-Host "  Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Checking table counts (should now have 1,299+ records):" -ForegroundColor Yellow
Write-Host ""

$tables = @{
    "Barangays" = "/api/barangays"
    "Fire Stations" = "/api/firestation"
    "Hydrants" = "/api/hydrants"
    "Notifications" = "/api/notifications"
}

$totalRecords = 0
foreach ($table in $tables.Keys) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl$($tables[$table])" -Method GET -Headers $headers -ErrorAction Stop
        $count = if ($response -is [Array]) { $response.Count } else { 0 }
        $totalRecords += $count
        Write-Host "  $table`: $count records" -ForegroundColor $(if ($count -gt 0) { "Green" } else { "Yellow" })
    } catch {
        Write-Host "  $table`: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
if ($totalRecords -gt 100) {
    Write-Host "SUCCESS Connected to Oregon database with data!" -ForegroundColor Green
    Write-Host "(Total records across tables: $totalRecords)" -ForegroundColor Gray
} else {
    Write-Host "WARNING Still showing few records ($totalRecords total)" -ForegroundColor Yellow
    Write-Host "May need to check DATABASE_URL in Railway" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Ready to Generate Forecasts ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "The forecast generation should now:" -ForegroundColor Yellow
Write-Host "  - Take 2-3 minutes (not 0.4 minutes)" -ForegroundColor Gray
Write-Host "  - Process 1,299 historical fire records" -ForegroundColor Gray
Write-Host "  - Generate forecasts for 27 barangays" -ForegroundColor Gray
Write-Host "  - Store forecasts in database" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Start forecast generation now? (y/n)"
if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    Write-Host ""
    Write-Host "=== Starting Forecast Generation ===" -ForegroundColor Cyan
    Write-Host "(This will take 2-3 minutes...)" -ForegroundColor Gray
    Write-Host ""
    
    $startTime = Get-Date
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/generate-enhanced" -Method POST -Headers $headers -TimeoutSec 300
        $duration = ((Get-Date) - $startTime).TotalMinutes
        
        Write-Host ""
        Write-Host "=== GENERATION COMPLETE ===" -ForegroundColor Green
        Write-Host ""
        Write-Host "Success: $($response.success)" -ForegroundColor $(if ($response.success) { "Green" } else { "Red" })
        Write-Host "Successful forecasts: $($response.successful_forecasts)" -ForegroundColor White
        Write-Host "Failed forecasts: $($response.failed_forecasts)" -ForegroundColor White
        Write-Host "Duration: $([math]::Round($duration, 2)) minutes" -ForegroundColor White
        
        Write-Host ""
        Write-Host "ANALYSIS:" -ForegroundColor Cyan
        if ($duration -ge 1.5) {
            Write-Host "  Duration looks good! Real processing happened." -ForegroundColor Green
        } else {
            Write-Host "  Duration still too fast - may not have processed real data" -ForegroundColor Yellow
        }
        
        if ($response.warnings -and $response.warnings.Count -gt 0) {
            Write-Host ""
            Write-Host "Warnings:" -ForegroundColor Yellow
            $response.warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        }
        
        # Verify forecasts were stored
        Write-Host ""
        Write-Host "Verifying forecasts in database..." -ForegroundColor Cyan
        Start-Sleep -Seconds 2
        
        $forecasts = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/arima/all" -Method GET -Headers $headers
        Write-Host "  Forecast records: $($forecasts.forecasts.Count)" -ForegroundColor $(if ($forecasts.forecasts.Count -gt 0) { "Green" } else { "Red" })
        
        if ($forecasts.forecasts.Count -gt 0) {
            Write-Host ""
            Write-Host "SUCCESS Forecasts generated and stored!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Sample forecasts:" -ForegroundColor Yellow
            $forecasts.forecasts | Select-Object -First 3 | ForEach-Object {
                Write-Host "  $($_.barangay) - $($_.forecast_month) - $([math]::Round($_.predicted_cases, 2)) cases (Risk: $($_.risk_level))" -ForegroundColor Gray
            }
        } else {
            Write-Host ""
            Write-Host "FAILED No forecasts were stored in database" -ForegroundColor Red
            Write-Host "Check Railway logs for Python script errors" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host ""
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host ""
    Write-Host "Skipped. Run .\regenerate_forecasts.ps1 when ready." -ForegroundColor Gray
}

Write-Host ""
