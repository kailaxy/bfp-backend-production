# Wait for Railway to restart and check status
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Waiting for Railway to Restart ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Railway is restarting after DATABASE_URL change..." -ForegroundColor Yellow
Write-Host ""

$maxAttempts = 12  # 12 attempts = 1 minute
$attempt = 0
$isUp = $false

while ($attempt -lt $maxAttempts -and -not $isUp) {
    $attempt++
    Write-Host "Attempt $attempt/$maxAttempts - Checking if backend is up..." -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
        if ($response.ok) {
            $isUp = $true
            Write-Host "  SUCCESS Backend is up!" -ForegroundColor Green
            Write-Host "  Database connected: $($response.db.connected)" -ForegroundColor White
            break
        }
    } catch {
        Write-Host "  Not ready yet... (Error: $($_.Exception.Message.Substring(0, 50))...)" -ForegroundColor DarkGray
        Start-Sleep -Seconds 5
    }
}

if (-not $isUp) {
    Write-Host ""
    Write-Host "Backend still not responding after $maxAttempts attempts" -ForegroundColor Red
    Write-Host "Please check Railway logs for errors" -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "=== Backend is Ready! ===" -ForegroundColor Green
Write-Host ""

# Now try to login and check data
Write-Host "Logging in..." -ForegroundColor Cyan
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
Write-Host "Checking table counts..." -ForegroundColor Cyan
$tables = @{
    "Barangays" = "/api/barangays"
    "Fire Stations" = "/api/firestation"
    "Hydrants" = "/api/hydrants"
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
Write-Host "=== Ready for Forecast Generation ===" -ForegroundColor Green
Write-Host ""
Write-Host "Run this command to generate forecasts:" -ForegroundColor Yellow
Write-Host "  .\regenerate_forecasts.ps1" -ForegroundColor White
Write-Host ""
