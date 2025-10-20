# Test graph endpoint directly
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Testing Graph Endpoint ===`n"

# Login
Write-Host "Logging in..."
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing
    
    $login = $loginResponse.Content | ConvertFrom-Json
    $token = $login.token
    Write-Host "✅ Logged in`n"
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)`n"
    exit
}

# Test graph endpoint
Write-Host "Testing graph endpoint for Addition Hills..."
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $barangay = [System.Web.HttpUtility]::UrlEncode("Addition Hills")
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/$barangay" `
        -Method GET `
        -Headers $headers
    
    Write-Host "✅ SUCCESS! Graph data retrieved!`n"
    Write-Host "Total records: $($response.totalRecords)"
    Write-Host "Date range: $($response.dateRange.min) to $($response.dateRange.max)"
    Write-Host "Datasets:"
    $response.datasets | ForEach-Object {
        Write-Host "  - $($_.label): $($_.count) points"
    }
    Write-Host "`n✅ Graph visualization is WORKING!`n"
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)`n"
}
