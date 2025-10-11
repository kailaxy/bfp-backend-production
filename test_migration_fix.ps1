# Test the fixed migration endpoint
Write-Host "=== Testing Fixed Migration Endpoint ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Waiting 60 seconds for Railway deployment to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 60
Write-Host ""

$baseUrl = "https://bfp-backend-production.up.railway.app"

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "bFpAdm#2025!xY"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "SUCCESS: Logged in" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Login failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

# Step 2: Run migration with explicit transaction control
Write-Host "Step 2: Running migration with explicit transaction control..." -ForegroundColor Yellow
try {
    $migrateResponse = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/migrate-graph-table" -Method POST -Headers @{
        "Authorization" = "Bearer $token"
    } -ErrorAction Stop
    
    Write-Host "SUCCESS: Migration completed" -ForegroundColor Green
    Write-Host ""
    Write-Host "Migration Response:" -ForegroundColor Cyan
    Write-Host "  Transaction Committed: $($migrateResponse.transaction_committed)" -ForegroundColor $(if($migrateResponse.transaction_committed) {"Green"} else {"Red"})
    Write-Host "  Final Verification: $($migrateResponse.final_verification)" -ForegroundColor $(if($migrateResponse.final_verification) {"Green"} else {"Red"})
    Write-Host "  Columns: $($migrateResponse.table_structure.Count)"
    Write-Host "  Indexes: $($migrateResponse.indexes.Count)"
    Write-Host ""
} catch {
    Write-Host "ERROR: Migration failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Step 3: Wait a moment for transaction to fully settle
Write-Host "Step 3: Waiting 3 seconds for transaction to settle..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""

# Step 4: Test GET endpoint to verify table exists
Write-Host "Step 4: Testing GET endpoint to verify table is queryable..." -ForegroundColor Yellow
try {
    $getResponse = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Addition%20Hills" -Method GET -Headers @{
        "Authorization" = "Bearer $token"
    } -ErrorAction Stop
    
    Write-Host "SUCCESS: Table exists and is queryable!" -ForegroundColor Green
    Write-Host "  Note: Got 404 because no data exists yet (this is expected)" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 404) {
        Write-Host "SUCCESS: Table exists! (404 = no data, which is expected)" -ForegroundColor Green
    } elseif ($statusCode -eq 400) {
        Write-Host "ERROR: Table still doesn't exist (400 = Bad Request)" -ForegroundColor Red
        Write-Host "The migration with explicit transactions still didn't work." -ForegroundColor Red
    } else {
        Write-Host "ERROR: Unexpected status code: $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# Step 5: Final verdict
Write-Host "=== Final Verdict ===" -ForegroundColor Cyan
if ($statusCode -eq 404 -or $statusCode -eq 200) {
    Write-Host "SUCCESS: Migration worked! Table is created and persistent." -ForegroundColor Green
    Write-Host "Next step: Regenerate forecasts to populate the table" -ForegroundColor Yellow
} else {
    Write-Host "FAILED: Table still not created despite explicit transaction control" -ForegroundColor Red
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "  1. Railway is using a read replica for queries but writes go to primary"
    Write-Host "  2. Database connection pool is using different connections"
    Write-Host "  3. Schema permissions issue"
    Write-Host ""
    Write-Host "Alternative approach needed:" -ForegroundColor Yellow
    Write-Host "  - Use Railway CLI: railway connect postgres"
    Write-Host "  - Then run the SQL directly"
}
Write-Host ""
