# Test GET endpoint with different barangay names
Write-Host "=== Testing GET Endpoint with Different Barangay Names ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://bfp-backend-production.up.railway.app"

# Login
Write-Host "Logging in..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "bFpAdm#2025!xY"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "SUCCESS: Logged in`n" -ForegroundColor Green

# Test with different barangay names
$barangays = @(
    "Addition Hills",
    "Addition%20Hills",
    "Cembo",
    "Guadalupe",
    "Makati"
)

foreach ($barangay in $barangays) {
    Write-Host "Testing: $barangay" -NoNewline
    
    $encodedBarangay = [System.Web.HttpUtility]::UrlEncode($barangay)
    Write-Host " (encoded: $encodedBarangay)" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/$encodedBarangay" -Method GET -Headers @{
            "Authorization" = "Bearer $token"
        } -ErrorAction Stop
        
        Write-Host "  SUCCESS (200): Got data" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        switch ($statusCode) {
            404 { Write-Host "  SUCCESS (404): Table exists, no data (expected)" -ForegroundColor Green }
            400 { Write-Host "  ERROR (400): Bad Request" -ForegroundColor Red }
            500 { Write-Host "  ERROR (500): Server Error" -ForegroundColor Red }
            default { Write-Host "  ERROR ($statusCode): Unknown error" -ForegroundColor Red }
        }
    }
}

Write-Host ""
Write-Host "If all return 400, there's a route/middleware issue"
Write-Host "If all return 404, the table exists but is empty (good!)"
Write-Host ""
