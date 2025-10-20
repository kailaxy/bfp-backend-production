# Extended diagnosis with retries
Write-Host "=== Extended Migration Diagnosis ===" -ForegroundColor Cyan
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

# Run migration
Write-Host "Running migration..." -ForegroundColor Yellow
$migrateResponse = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/migrate-graph-table" -Method POST -Headers @{
    "Authorization" = "Bearer $token"
}
Write-Host "Migration Response:" -ForegroundColor Cyan
Write-Host "  Success: $($migrateResponse.success)"
Write-Host "  Transaction Committed: $($migrateResponse.transaction_committed)"
Write-Host "  Final Verification: $($migrateResponse.final_verification)"
Write-Host ""

# Test GET endpoint with retries (in case of replication lag)
Write-Host "Testing GET endpoint with retries (10 attempts, 3s intervals)..." -ForegroundColor Yellow
$maxRetries = 10
$retryDelay = 3

for ($i = 1; $i -le $maxRetries; $i++) {
    Write-Host "  Attempt $i/$maxRetries..." -NoNewline
    
    try {
        $getResponse = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Addition%20Hills" -Method GET -Headers @{
            "Authorization" = "Bearer $token"
        } -ErrorAction Stop
        
        Write-Host " SUCCESS (200)" -ForegroundColor Green
        Write-Host "Table exists and is queryable!" -ForegroundColor Green
        break
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq 404) {
            Write-Host " SUCCESS (404 - no data)" -ForegroundColor Green
            Write-Host "Table exists! 404 means no data for this barangay (expected)" -ForegroundColor Green
            break
        } elseif ($statusCode -eq 400) {
            Write-Host " FAILED (400 - table missing)" -ForegroundColor Red
            
            if ($i -lt $maxRetries) {
                Write-Host "  Waiting ${retryDelay}s for replication..." -ForegroundColor Gray
                Start-Sleep -Seconds $retryDelay
            }
        } else {
            Write-Host " ERROR ($statusCode)" -ForegroundColor Red
            break
        }
    }
}

Write-Host ""
Write-Host "=== Conclusion ===" -ForegroundColor Cyan
Write-Host "The table is being created but GET queries can't find it."
Write-Host "This indicates either:"
Write-Host "  1. Different database connections (pool vs direct)"
Write-Host "  2. Read replica lag (unlikely with 30s delay)"
Write-Host "  3. Schema/permissions issue"
Write-Host ""
Write-Host "Recommended next step: Use Railway CLI to connect directly"
Write-Host "  railway login"
Write-Host "  railway link"
Write-Host "  railway connect postgres"
Write-Host "  Then paste the SQL from migrations/create_forecasts_graphs_table.sql"
Write-Host ""
