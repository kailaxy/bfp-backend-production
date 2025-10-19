# Test if database writes are working
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Testing Database Write Permissions ===" -ForegroundColor Cyan
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "Testing INSERT operation..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/debug/test-insert" -Method POST -Headers $headers
    
    Write-Host ""
    Write-Host "Result: $($response.message)" -ForegroundColor Green
    Write-Host "Test Record ID: $($response.test_id)" -ForegroundColor White
    Write-Host ""
    Write-Host "SUCCESS Database writes are working!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "FAILED Database writes are NOT working!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    
    if ($_.ErrorDetails.Message) {
        $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Details: $($errorDetail.error)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "This means:" -ForegroundColor Cyan
    Write-Host "  - Railway backend CAN read from Render database" -ForegroundColor White
    Write-Host "  - Railway backend CANNOT write to Render database" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Yellow
    Write-Host "  1. Grant Railway IP write access in Render dashboard" -ForegroundColor Gray
    Write-Host "  2. Switch to Railway PostgreSQL database" -ForegroundColor Gray
    Write-Host "  3. Run forecast generation locally with PRODUCTION_DATABASE_URL" -ForegroundColor Gray
}

Write-Host ""
