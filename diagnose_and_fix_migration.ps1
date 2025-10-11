# Diagnose and fix the migration issue
Write-Host "=== Diagnosing Migration Issue ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://bfp-backend-production.up.railway.app"

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "bFpAdm#2025!xY"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "SUCCESS: Logged in" -ForegroundColor Green
Write-Host ""

# Step 2: Check database connection info (if endpoint exists)
Write-Host "Step 2: Checking database connection..." -ForegroundColor Yellow
try {
    $dbInfoResponse = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/db-info" -Method GET -Headers @{
        "Authorization" = "Bearer $token"
    } -ErrorAction Stop
    
    Write-Host "Database Info:" -ForegroundColor Cyan
    Write-Host ($dbInfoResponse | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "NOTE: Database info endpoint not available (expected)" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Try to query the table directly
Write-Host "Step 3: Checking if table exists via query..." -ForegroundColor Yellow
try {
    $testQuery = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/test-barangay" -Method GET -Headers @{
        "Authorization" = "Bearer $token"
    } -ErrorAction Stop
    
    Write-Host "SUCCESS: Table exists and is queryable" -ForegroundColor Green
    Write-Host ($testQuery | ConvertTo-Json -Depth 3)
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "EXPECTED ERROR: Table doesn't exist (Status: $statusCode)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Run migration with explicit transaction
Write-Host "Step 4: Running migration again..." -ForegroundColor Yellow
try {
    $migrateResponse = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/migrate-graph-table" -Method POST -Headers @{
        "Authorization" = "Bearer $token"
    } -ErrorAction Stop
    
    Write-Host "Migration Response:" -ForegroundColor Cyan
    Write-Host ($migrateResponse | ConvertTo-Json -Depth 5)
    Write-Host ""
} catch {
    Write-Host "ERROR: Migration failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
}

# Step 5: Verify table existence again
Write-Host "Step 5: Verifying table after migration..." -ForegroundColor Yellow
try {
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/test-barangay" -Method GET -Headers @{
        "Authorization" = "Bearer $token"
    } -ErrorAction Stop
    
    Write-Host "SUCCESS: Table NOW exists!" -ForegroundColor Green
    Write-Host ($verifyResponse | ConvertTo-Json -Depth 3)
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "Table exists but no data for test-barangay (this is OK)" -ForegroundColor Yellow
    } else {
        Write-Host "PROBLEM: Table still doesn't exist (Status: $statusCode)" -ForegroundColor Red
        Write-Host "This means the migration is not actually creating the table" -ForegroundColor Red
    }
}
Write-Host ""

# Step 6: Recommendations
Write-Host "=== Recommendations ===" -ForegroundColor Cyan
Write-Host "1. The migration endpoint returns success but table isn't created"
Write-Host "2. This suggests the SQL is executing on a different database or not committing"
Write-Host "3. Next steps:"
Write-Host "   - Check Railway dashboard to see which Postgres database is actually connected"
Write-Host "   - Use Railway CLI to run SQL directly: railway connect postgres"
Write-Host "   - Or modify the migration endpoint to use explicit BEGIN/COMMIT/ROLLBACK"
Write-Host ""
