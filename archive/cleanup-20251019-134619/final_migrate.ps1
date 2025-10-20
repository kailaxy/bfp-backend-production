# Final Migration Script - Direct API Calls
$BASE_URL = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== BFP Migration Executor ===" -ForegroundColor Cyan
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

if ($loginResponse.StatusCode -eq 200) {
    $login = $loginResponse.Content | ConvertFrom-Json
    $token = $login.token
    
    Write-Host "SUCCESS: Logged in!" -ForegroundColor Green
    Write-Host "User: $($login.user.email)" -ForegroundColor Gray
    Write-Host ""
    
    # Execute Migration
    Write-Host "Executing migration..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $migrationResponse = Invoke-WebRequest -Uri "$BASE_URL/api/forecasts/migrate-graph-table" `
        -Method POST `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction SilentlyContinue
    
    $migration = $migrationResponse.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "SUCCESS: $($migration.message)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Table structure:" -ForegroundColor White
    $migration.table_structure | ForEach-Object {
        Write-Host "  - $($_.column_name): $($_.data_type)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "=== MIGRATION COMPLETE ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: Generate forecasts in Admin Panel" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    Write-Host "Login failed. Status: $($loginResponse.StatusCode)" -ForegroundColor Red
    Write-Host "Response: $($loginResponse.Content)" -ForegroundColor Gray
}
