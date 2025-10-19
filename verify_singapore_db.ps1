# After Railway restarts, verify Singapore database connection
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Waiting for Railway to restart with Singapore DB ===" -ForegroundColor Cyan
Write-Host ""

# Wait a bit for restart
Write-Host "Waiting 10 seconds for restart..." -ForegroundColor Gray
Start-Sleep -Seconds 10

$maxAttempts = 6
$attempt = 0
$isUp = $false

while ($attempt -lt $maxAttempts -and -not $isUp) {
    $attempt++
    Write-Host "Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $isUp = $true
            Write-Host "  Backend is up!" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "  Not ready..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 5
    }
}

if (-not $isUp) {
    Write-Host "Backend not responding" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Checking database connection..." -ForegroundColor Cyan

# Login
try {
    $loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    $headers = @{ "Authorization" = "Bearer $token" }
    Write-Host "  Login successful!" -ForegroundColor Green
} catch {
    Write-Host "  Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "If still failing, Railway may still be restarting. Wait 30 more seconds and run:" -ForegroundColor Yellow
    Write-Host "  .\verify_and_generate.ps1" -ForegroundColor White
    exit
}

Write-Host ""
Write-Host "Checking data tables:" -ForegroundColor Cyan
$tables = @{
    "Barangays" = "/api/barangays"
    "Fire Stations" = "/api/firestation"
}

foreach ($table in $tables.Keys) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl$($tables[$table])" -Method GET -Headers $headers -ErrorAction Stop
        $count = if ($response -is [Array]) { $response.Count } else { 0 }
        Write-Host "  $table`: $count records" -ForegroundColor $(if ($count -gt 0) { "Green" } else { "Yellow" })
    } catch {
        Write-Host "  $table`: ERROR" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== The Real Issue ===" -ForegroundColor Red
Write-Host ""
Write-Host "The Singapore database IS the correct one with 1,299 historical fires." -ForegroundColor Yellow
Write-Host "But earlier we saw 0 barangays, 0 fire stations in Singapore database." -ForegroundColor Yellow
Write-Host ""
Write-Host "This means either:" -ForegroundColor Cyan
Write-Host "  1. The historical_fires table has data but other tables don't" -ForegroundColor White
Write-Host "  2. The historical_fires records have NULL barangay or reported_at fields" -ForegroundColor White
Write-Host "  3. The query WHERE conditions filter out all records" -ForegroundColor White
Write-Host ""
Write-Host "Next: We need to check the actual historical_fires data structure" -ForegroundColor Yellow
Write-Host ""
