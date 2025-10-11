# Check Graph Data in Database
$BASE_URL = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Checking Graph Data ===" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "Logging in..." -ForegroundColor Yellow
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'

$loginResponse = Invoke-WebRequest -Uri "$BASE_URL/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody `
    -UseBasicParsing `
    -ErrorAction SilentlyContinue

$login = $loginResponse.Content | ConvertFrom-Json
$token = $login.token

Write-Host "SUCCESS: Logged in" -ForegroundColor Green
Write-Host ""

# Test graph endpoint for Addition Hills
Write-Host "Testing graph endpoint for Addition Hills..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $graphResponse = Invoke-WebRequest -Uri "$BASE_URL/api/forecasts/graphs/Addition%20Hills" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $graph = $graphResponse.Content | ConvertFrom-Json
    
    Write-Host "SUCCESS: Graph data found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Metadata:" -ForegroundColor White
    Write-Host "  Barangay: $($graph.barangay)" -ForegroundColor Gray
    Write-Host "  Total records: $($graph.metadata.total_records)" -ForegroundColor Gray
    Write-Host "  Date range: $($graph.metadata.date_range.start) to $($graph.metadata.date_range.end)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Dataset counts:" -ForegroundColor White
    Write-Host "  Actual: $($graph.metadata.datasets.actual)" -ForegroundColor Gray
    Write-Host "  Fitted: $($graph.metadata.datasets.fitted)" -ForegroundColor Gray
    Write-Host "  Forecast: $($graph.metadata.datasets.forecast)" -ForegroundColor Gray
    Write-Host "  CI Lower: $($graph.metadata.datasets.ci_lower)" -ForegroundColor Gray
    Write-Host "  CI Upper: $($graph.metadata.datasets.ci_upper)" -ForegroundColor Gray
    Write-Host "  Moving Avg: $($graph.metadata.datasets.moving_avg_6)" -ForegroundColor Gray
    
} catch {
    Write-Host "ERROR: Graph endpoint failed" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Gray
    
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host ""
        Write-Host "ISSUE: No graph data in database" -ForegroundColor Yellow
        Write-Host "This means the forecast generation didn't store graph data." -ForegroundColor Yellow
    }
}

Write-Host ""
