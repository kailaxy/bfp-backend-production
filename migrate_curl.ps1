# BFP Migration - Direct curl commands
# Use these commands in PowerShell

$BASE_URL = "https://bfp-backend-production.up.railway.app"
$EMAIL = "admin@example.com"
$PASSWORD = "bFpAdm#2025!xY"

Write-Host ""
Write-Host "=== BFP Migration - Direct curl Method ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login
Write-Host "Step 1: Login to get JWT token..." -ForegroundColor Yellow

$loginCommand = @"
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}'
"@

Write-Host "Executing login..." -ForegroundColor Gray

$loginResult = curl.exe -X POST "$BASE_URL/api/auth/login" `
  -H "Content-Type: application/json" `
  -d "{`"email`":`"$EMAIL`",`"password`":`"$PASSWORD`"}" 2>&1

Write-Host $loginResult
Write-Host ""

# Parse token from response
$loginJson = $loginResult | ConvertFrom-Json -ErrorAction SilentlyContinue

if ($loginJson.token) {
    $token = $loginJson.token
    Write-Host "SUCCESS: Login successful!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0,30))..." -ForegroundColor Gray
    Write-Host ""
    
    # Step 2: Execute Migration
    Write-Host "Step 2: Execute migration..." -ForegroundColor Yellow
    
    $migrationResult = curl.exe -X POST "$BASE_URL/api/forecasts/migrate-graph-table" `
      -H "Authorization: Bearer $token" `
      -H "Content-Type: application/json" 2>&1
    
    Write-Host $migrationResult
    Write-Host ""
    
    $migrationJson = $migrationResult | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($migrationJson.success) {
        Write-Host "SUCCESS: Migration complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Go to Admin Panel > Forecasts" -ForegroundColor White
        Write-Host "2. Click 'Generate/Regenerate' button" -ForegroundColor White
        Write-Host "3. Wait 10-15 minutes" -ForegroundColor White
        Write-Host "4. Click 'View Graph' on any barangay" -ForegroundColor White
    } else {
        Write-Host "Migration response received (check above)" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "ERROR: Login failed. Check credentials." -ForegroundColor Red
    Write-Host "Response: $loginResult" -ForegroundColor Gray
}

Write-Host ""
