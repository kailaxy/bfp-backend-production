# Test if Railway's Singapore database has historical fires
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Testing Railway's Database Content ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Railway DATABASE_URL: singapore-postgres.render.com" -ForegroundColor Yellow
Write-Host "Your admin panel:     oregon-postgres.render.com" -ForegroundColor Yellow
Write-Host ""
Write-Host "THESE ARE DIFFERENT DATABASES!" -ForegroundColor Red
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "Testing what data exists in Railway's database:" -ForegroundColor Cyan
Write-Host ""

# Test tables
$tables = @{
    "Barangays" = "/api/barangays"
    "Fire Stations" = "/api/firestation"
    "Active Fires" = "/api/active-fires"
    "Hydrants" = "/api/hydrants"
    "Notifications" = "/api/notifications"
}

foreach ($table in $tables.Keys) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl$($tables[$table])" -Method GET -Headers $headers -ErrorAction Stop
        $count = if ($response -is [Array]) { $response.Count } else { 0 }
        Write-Host "  $table`: $count records" -ForegroundColor $(if ($count -gt 0) { "Green" } else { "Yellow" })
    } catch {
        Write-Host "  $table`: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Graph data:" -ForegroundColor Cyan
try {
    $graphData = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Addition%20Hills" -Method GET -Headers $headers
    Write-Host "  Total: $($graphData.metadata.total_records) records" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== DIAGNOSIS ===" -ForegroundColor Red
Write-Host ""
Write-Host "You have TWO Render databases:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Oregon database (admin panel shows this)" -ForegroundColor White
Write-Host "     - dpg-d35r1s2li9vc73819f70-a.oregon-postgres.render.com" -ForegroundColor Gray
Write-Host "     - Has 1,299 historical fire records" -ForegroundColor Green
Write-Host "     - This is where you're adding data" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Singapore database (Railway uses this)" -ForegroundColor White  
Write-Host "     - dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com" -ForegroundColor Gray
Write-Host "     - Has 0 (or different) historical fire records" -ForegroundColor Red
Write-Host "     - This is what forecast generation queries" -ForegroundColor Gray
Write-Host ""
Write-Host "SOLUTION:" -ForegroundColor Green
Write-Host "  Change Railway's DATABASE_URL to use the Oregon database" -ForegroundColor White
Write-Host "  (The one with 1,299 records)" -ForegroundColor Yellow
Write-Host ""
