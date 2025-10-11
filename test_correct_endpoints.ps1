# Test various endpoints with correct paths
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Testing Correct Endpoint Paths ===`n"

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
    Write-Host "✅ SUCCESS - Found $($response.Count) barangays"
    Write-Host "   First barangay: $($response[0].barangay_name)`n"
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)`n"
}

# Test 2: Fire stations endpoint (correct path: /api/firestation)
Write-Host "Test 2: GET /api/firestation"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/firestation" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS - Found $($response.Count) fire stations"
    if ($response.Count -gt 0) {
        Write-Host "   First station: $($response[0].station_name)`n"
    } else {
        Write-Host ""
    }
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)`n"
}

# Test 3: Active fires endpoint (correct path: /api/active_fires)
Write-Host "Test 3: GET /api/active_fires"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/active_fires" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS - Found $($response.Count) active fires`n"
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)`n"
}

# Test 4: Incidents history endpoint
Write-Host "Test 4: GET /api/incidentsHistory?limit=10"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/incidentsHistory?limit=10" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS - Found $($response.Count) incidents"
    if ($response.Count -gt 0) {
        Write-Host "   First incident: $($response[0].barangay) on $($response[0].date)`n"
    } else {
        Write-Host ""
    }
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)`n"
}

# Test 5: Forecasts ARIMA endpoint
Write-Host "Test 5: GET /api/forecasts/arima/all"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/arima/all" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS - Found $($response.forecasts.Count) forecasts`n"
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)`n"
}

# Test 6: Graph endpoint (the problematic one)
Write-Host "Test 6: GET /api/forecasts/graphs/Addition%20Hills"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Addition%20Hills" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS - Graph data received"
    Write-Host "   Record types: $($response.graphData.Count)`n"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $errorBody = $_.ErrorDetails.Message
    Write-Host "❌ FAILED: Status $statusCode"
    Write-Host "   Error: $errorBody`n"
}

Write-Host "=== Test Complete ===`n"
