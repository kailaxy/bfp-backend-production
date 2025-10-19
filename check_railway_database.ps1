# Check which database Railway is ACTUALLY connected to
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Checking Railway Database Connection ===" -ForegroundColor Cyan
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "Expected Render DB: dpg-d35r1s2li9vc73819f70-a.oregon-postgres.render.com" -ForegroundColor Yellow
Write-Host "                    Database: bfpmapping_nua2" -ForegroundColor Yellow
Write-Host ""

# The health endpoint might show database info
Write-Host "Checking health endpoint..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "  Connected: $($health.db.connected)" -ForegroundColor White
    if ($health.db.database) {
        Write-Host "  Database: $($health.db.database)" -ForegroundColor White
    }
    if ($health.db.host) {
        Write-Host "  Host: $($health.db.host)" -ForegroundColor White
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== CRITICAL CHECK ===" -ForegroundColor Red
Write-Host ""
Write-Host "Railway might be using Railway's OWN PostgreSQL database instead of Render!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Two possibilities:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Railway has its OWN empty database" -ForegroundColor White
Write-Host "   - Railway DATABASE_URL = postgres://...railway..." -ForegroundColor Gray
Write-Host "   - This database is EMPTY (0 historical fires)" -ForegroundColor Gray
Write-Host "   - Forecasts can't be generated (no data)" -ForegroundColor Red
Write-Host ""
Write-Host "2. Railway is using Render database" -ForegroundColor White
Write-Host "   - Railway DATABASE_URL = postgres://...render.com..." -ForegroundColor Gray
Write-Host "   - This database has 1,299 historical fires" -ForegroundColor Gray
Write-Host "   - But query returns 0 rows (different issue)" -ForegroundColor Red
Write-Host ""
Write-Host "Please check Railway dashboard:" -ForegroundColor Yellow
Write-Host "  1. Go to https://railway.app" -ForegroundColor White
Write-Host "  2. Open your bfp-backend project" -ForegroundColor White
Write-Host "  3. Click 'Variables' tab" -ForegroundColor White
Write-Host "  4. Find DATABASE_URL" -ForegroundColor White
Write-Host "  5. Does it say 'render.com' or 'railway.app/rlwy.net'?" -ForegroundColor White
Write-Host ""
Write-Host "If it says 'railway.app' or 'rlwy.net':" -ForegroundColor Cyan
Write-Host "  -> Railway is using its own empty database" -ForegroundColor Red
Write-Host "  -> SOLUTION: Change DATABASE_URL to point to Render" -ForegroundColor Green
Write-Host ""
Write-Host "If it says 'render.com':" -ForegroundColor Cyan
Write-Host "  -> Railway IS connected to Render" -ForegroundColor Green
Write-Host "  -> Issue is with the query or data format" -ForegroundColor Yellow
Write-Host ""
