# Test inserting data into forecasts_graphs table
$BASE_URL = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Testing Graph Data Insert ===`n"

# Login
Write-Host "Logging in..."
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'

try {
    $loginResponse = Invoke-WebRequest -Uri "$BASE_URL/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing

    $login = $loginResponse.Content | ConvertFrom-Json
    $token = $login.token
    Write-Host "✅ Logged in`n"
} catch {
    Write-Host "❌ Login failed"
    exit
}

# Test insert
Write-Host "Testing insert into forecasts_graphs table..."
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/forecasts/debug/test-insert" `
        -Method POST `
        -Headers $headers `
        -UseBasicParsing
    
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "✅ Test insert successful!" -ForegroundColor Green
        Write-Host "   Inserted ID: $($result.insertedId)"
        Write-Host "   Record: $($result.insertedRecord | ConvertTo-Json -Compress)"
    } else {
        Write-Host "❌ Test insert failed: $($result.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "   Details: $($_.ErrorDetails.Message)"
    }
}

Write-Host "`n"
