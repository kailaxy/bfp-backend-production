# Test the graph endpoint
$BASE_URL = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Testing Graph Endpoint ===`n"

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$BASE_URL/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token

Write-Host "✅ Logged in`n"

# Test graph endpoint for Addition Hills
$headers = @{ "Authorization" = "Bearer $token" }
$barangay = [System.Web.HttpUtility]::UrlEncode("Addition Hills")

Write-Host "Fetching graph data for Addition Hills..."

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/forecasts/graphs/$barangay" -Method GET -Headers $headers -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ SUCCESS! Graph data retrieved!" -ForegroundColor Green
    Write-Host "   Total records: $($data.totalRecords)"
    Write-Host "   Date range: $($data.dateRange.earliest) to $($data.dateRange.latest)"
    Write-Host "   Datasets:"
    $data.datasets | ForEach-Object {
        Write-Host "      - $($_.label): $($_.count) points"
    }
    Write-Host "`n🎉 Graph visualization should work now!`n"
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Error $statusCode"
    if ($_.ErrorDetails) {
        Write-Host "   $($_.ErrorDetails.Message)"
    }
}
