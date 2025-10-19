# Verify which database the backend is actually using
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Verifying Database Connection ===" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "1. Logging in..." -ForegroundColor Yellow
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }
Write-Host "   OK Logged in" -ForegroundColor Green
Write-Host ""

# Get database info
Write-Host "2. Fetching database information..." -ForegroundColor Yellow
try {
    $dbInfo = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/debug/db-info" -Method GET -Headers $headers
    
    Write-Host ""
    Write-Host "Database Connection Details:" -ForegroundColor Cyan
    Write-Host "   Database Name: $($dbInfo.database)" -ForegroundColor White
    Write-Host "   Current User:  $($dbInfo.user)" -ForegroundColor White
    Write-Host "   Host:          $($dbInfo.host)" -ForegroundColor White
    
    if ($dbInfo.database -eq "bfpmapping_nua2") {
        Write-Host ""
        Write-Host "   OK CONFIRMED: Using Render Database (bfpmapping_nua2)" -ForegroundColor Green
    } elseif ($dbInfo.database -eq "railway") {
        Write-Host ""
        Write-Host "   WARNING: Using Railway Database" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "   WARNING: Using database: $($dbInfo.database)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "   Tables Found: $($dbInfo.table_count)" -ForegroundColor White
    Write-Host "   Graph Data:   $($dbInfo.graph_records) records" -ForegroundColor White
    
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Verification Complete ===" -ForegroundColor Cyan
Write-Host ""
