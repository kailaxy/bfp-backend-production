# Test various endpoints to see what's working
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Testing Various Endpoints ===`n"

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "✅ Logged in`n"

# Test 1: Barangays endpoint
Write-Host "Test 1: GET /api/barangays"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/barangays" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS - Found $($response.Count) barangays`n"
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)`n"
}

# Test 2: Fire stations endpoint
Write-Host "Test 2: GET /api/fire-stations"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/fire-stations" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS - Found $($response.Count) fire stations`n"
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)`n"
}

# Test 3: Forecasts ARIMA endpoint
Write-Host "Test 3: GET /api/forecasts/arima/all"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/arima/all" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS - Found $($response.forecasts.Count) forecasts`n"
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)`n"
}

# Test 4: Active fires endpoint
Write-Host "Test 4: GET /api/active-fires"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/active-fires" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS - Found $($response.Count) active fires`n"
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)`n"
}

# Test 5: Historical fires endpoint (with date filter)
Write-Host "Test 5: GET /api/historical-fires?startDate=2024-01-01&endDate=2024-12-31"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/historical-fires?startDate=2024-01-01&endDate=2024-12-31" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS - Found $($response.Count) historical fires`n"
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)`n"
}

Write-Host "=== Test Complete ===`n"
