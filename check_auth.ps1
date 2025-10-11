# Check if we're actually logged in as admin
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Checking Auth Status ===`n"

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$loginData = $loginResponse.Content | ConvertFrom-Json

Write-Host "Login response:"
Write-Host ($loginData | ConvertTo-Json -Depth 10)
Write-Host ""

# Try a known working admin endpoint
$headers = @{
    "Authorization" = "Bearer $($loginData.token)"
}

Write-Host "Testing known admin endpoint: /api/forecasts/arima/all"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/arima/all" -Method GET -Headers $headers
    Write-Host "✅ Admin access works! Found $($response.forecasts.Count) forecasts`n"
} catch {
    Write-Host "❌ Admin access failed: $($_.Exception.Message)`n"
}
