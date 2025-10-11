# Direct API test for graph data
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Testing Graph Data API ===`n"

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token

Write-Host "✅ Logged in`n"

$headers = @{
    "Authorization" = "Bearer $token"
}

# Test without URL encoding first
Write-Host "Test 1: Addition Hills (no encoding)"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Addition Hills" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS!"
    Write-Host "Total records: $($response.totalRecords)`n"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)`n"
}

# Test with URL encoding
Write-Host "Test 2: Addition Hills (URL encoded)"
try {
    $encoded = [System.Web.HttpUtility]::UrlEncode("Addition Hills")
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/$encoded" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS!"
    Write-Host "Total records: $($response.totalRecords)`n"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)`n"
}

# Test with different barangay
Write-Host "Test 3: Bangkal"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Bangkal" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS!"
    Write-Host "Total records: $($response.totalRecords)`n"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)`n"
}

# List available barangays from database
Write-Host "Test 4: Checking what barangays exist in forecasts_graphs..."
try {
    $query = "SELECT DISTINCT barangay FROM forecasts_graphs ORDER BY barangay LIMIT 10"
    # We'd need a database query endpoint for this
    Write-Host "Need database query endpoint to check available barangays`n"
} catch {
    Write-Host "Cannot check without database access`n"
}
