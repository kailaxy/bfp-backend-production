# Test all database tables to verify data exists
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Testing All Database Tables ===`n"

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "✅ Logged in`n"

# Test each table through available endpoints

Write-Host "1. Testing BARANGAYS table:"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/barangays" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($response.Count) barangays"
    if ($response.Count -gt 0) {
        Write-Host "   Sample: $($response[0].barangay_name)"
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)"
}

Write-Host "`n2. Testing MANDALUYONG_FIRE_STATIONS table:"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/firestation" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($response.Count) fire stations"
    if ($response.Count -gt 0) {
        Write-Host "   Sample: $($response[0].station_name)"
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)"
}

Write-Host "`n3. Testing ACTIVE_FIRES table:"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/active_fires" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($response.Count) active fires"
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)"
}

Write-Host "`n4. Testing HISTORICAL_FIRES table:"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/incidentsHistory?limit=5" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($response.Count) historical records (limited to 5)"
    if ($response.Count -gt 0) {
        Write-Host "   Sample: $($response[0].barangay) - $($response[0].date)"
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)"
}

Write-Host "`n5. Testing HYDRANTS table:"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/hydrants" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($response.Count) hydrants"
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)"
}

Write-Host "`n6. Testing USERS table:"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($response.users.Count) users"
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)"
}

Write-Host "`n7. Testing NOTIFICATIONS table:"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/notifications" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($response.Count) notifications"
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)"
}

Write-Host "`n8. Testing FORECASTS table:"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/arima/all" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($response.forecasts.Count) forecasts"
    if ($response.forecasts.Count -gt 0) {
        Write-Host "   Sample: $($response.forecasts[0].barangay) - $($response.forecasts[0].forecast_month)"
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)"
}

Write-Host "`n9. Testing FORECASTS_GRAPHS table:"
try {
    # Try Addition Hills first
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Addition%20Hills" -Method GET -Headers $headers
    Write-Host "   ✅ Found graph data for Addition Hills"
    Write-Host "   Total records: $($response.totalRecords)"
    Write-Host "   Record types: $($response.graphData.Count)"
    foreach ($dataset in $response.graphData) {
        Write-Host "      - $($dataset.record_type): $($dataset.data.Count) points"
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $errorBody = $_.ErrorDetails.Message
    Write-Host "   ❌ Error: Status $statusCode"
    Write-Host "   Message: $errorBody"
}

Write-Host "`n=== Summary ===`n"
Write-Host "All tables tested. Check results above.`n"
