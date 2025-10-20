# Test the diagnostic endpoint
Write-Host "=== Testing Table Existence Diagnostic ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Waiting 60 seconds for Railway deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 60
Write-Host ""

$baseUrl = "https://bfp-backend-production.up.railway.app"

# Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "bFpAdm#2025!xY"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "SUCCESS: Logged in`n" -ForegroundColor Green

# Test if table exists BEFORE migration
Write-Host "Step 2: Testing table existence BEFORE migration..." -ForegroundColor Yellow
try {
    $beforeTest = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/test-table-exists" -Method GET -Headers @{
        "Authorization" = "Bearer $token"
    }
    
    Write-Host "Table Exists (before): $($beforeTest.table_exists)" -ForegroundColor $(if($beforeTest.table_exists) {"Green"} else {"Red"})
    if ($beforeTest.table_exists) {
        Write-Host "  Row Count: $($beforeTest.row_count)"
    } else {
        Write-Host "  Error: $($beforeTest.error_message)" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERROR calling diagnostic endpoint" -ForegroundColor Red
}
Write-Host ""

# Run migration
Write-Host "Step 3: Running migration with explicit transaction..." -ForegroundColor Yellow
$migrateResponse = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/migrate-graph-table" -Method POST -Headers @{
    "Authorization" = "Bearer $token"
}
Write-Host "Migration completed:"
Write-Host "  Transaction Committed: $($migrateResponse.transaction_committed)" -ForegroundColor Green
Write-Host "  Final Verification: $($migrateResponse.final_verification)" -ForegroundColor Green
Write-Host ""

# Wait a moment
Write-Host "Step 4: Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""

# Test if table exists AFTER migration
Write-Host "Step 5: Testing table existence AFTER migration..." -ForegroundColor Yellow
try {
    $afterTest = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/test-table-exists" -Method GET -Headers @{
        "Authorization" = "Bearer $token"
    }
    
    Write-Host "Table Exists (after): $($afterTest.table_exists)" -ForegroundColor $(if($afterTest.table_exists) {"Green"} else {"Red"})
    if ($afterTest.table_exists) {
        Write-Host "  Row Count: $($afterTest.row_count)"
        Write-Host ""
        Write-Host "SUCCESS! Table created and persistent!" -ForegroundColor Green -BackgroundColor Black
    } else {
        Write-Host "  Error Code: $($afterTest.error_code)"
        Write-Host "  Error Message: $($afterTest.error_message)"
        Write-Host "  Is Missing Table: $($afterTest.is_missing_table)"
        Write-Host ""
        Write-Host "FAILED: Table still doesn't exist" -ForegroundColor Red -BackgroundColor Black
    }
} catch {
    Write-Host "ERROR calling diagnostic endpoint" -ForegroundColor Red
}
Write-Host ""

# Try the original GET endpoint
Write-Host "Step 6: Testing original GET endpoint..." -ForegroundColor Yellow
try {
    $getResponse = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/graphs/Addition%20Hills" -Method GET -Headers @{
        "Authorization" = "Bearer $token"
    } -ErrorAction Stop
    
    Write-Host "GET endpoint SUCCESS (200)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 404) {
        Write-Host "GET endpoint SUCCESS (404 - no data, which is expected)" -ForegroundColor Green
    } else {
        Write-Host "GET endpoint FAILED (Status: $statusCode)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
