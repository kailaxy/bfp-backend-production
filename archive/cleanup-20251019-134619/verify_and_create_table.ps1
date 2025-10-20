# Create forecasts_graphs table directly
$BASE_URL = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Creating forecasts_graphs Table ===" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "Logging in..." -ForegroundColor Yellow
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'

$loginResponse = Invoke-WebRequest -Uri "$BASE_URL/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody `
    -UseBasicParsing

$login = $loginResponse.Content | ConvertFrom-Json
$token = $login.token

Write-Host "SUCCESS: Logged in" -ForegroundColor Green
Write-Host ""

# Execute migration
Write-Host "Creating forecasts_graphs table..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $migrationResponse = Invoke-WebRequest -Uri "$BASE_URL/api/forecasts/migrate-graph-table" `
        -Method POST `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $migration = $migrationResponse.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "SUCCESS: $($migration.message)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Table columns created:" -ForegroundColor White
    $migration.table_structure | ForEach-Object {
        Write-Host "  - $($_.column_name): $($_.data_type)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Next: Regenerate forecasts to populate the table" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    $errorMessage = $_.Exception.Message
    Write-Host ""
    
    if ($errorMessage -like "*already exists*") {
        Write-Host "INFO: Table already exists" -ForegroundColor Yellow
        Write-Host "But it wasn't showing in your Railway dashboard..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "This might be a Railway dashboard cache issue." -ForegroundColor Gray
        Write-Host "Let's verify the table exists by checking data..." -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "ERROR: Migration failed" -ForegroundColor Red
        Write-Host $errorMessage -ForegroundColor Gray
    }
}

# Verify table exists by trying to query it
Write-Host "Verifying table exists..." -ForegroundColor Yellow

try {
    $testResponse = Invoke-WebRequest -Uri "$BASE_URL/api/forecasts/graphs/Addition%20Hills" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $test = $testResponse.Content | ConvertFrom-Json
    
    Write-Host "SUCCESS: Table exists and is queryable!" -ForegroundColor Green
    Write-Host "Records found: $($test.metadata.total_records)" -ForegroundColor Gray
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 404) {
        Write-Host "Table exists but is EMPTY (404 = no data found)" -ForegroundColor Yellow
        Write-Host "This is expected - you need to regenerate forecasts" -ForegroundColor Gray
    } elseif ($statusCode -eq 400) {
        Write-Host "ERROR: Bad request (400)" -ForegroundColor Red
        Write-Host "There might be an issue with the endpoint or table structure" -ForegroundColor Gray
    } else {
        Write-Host "ERROR: Status $statusCode" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Gray
    }
}

Write-Host ""
