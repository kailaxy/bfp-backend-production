# Direct Migration with Token
# If you have a JWT token from your browser, paste it here

$BASE_URL = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== BFP Migration Executor (Token Method) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you have a JWT token from your browser:" -ForegroundColor Yellow
Write-Host "1. Open browser DevTools (F12)" -ForegroundColor Gray
Write-Host "2. Go to Application > Local Storage" -ForegroundColor Gray
Write-Host "3. Find 'token' key and copy the value" -ForegroundColor Gray
Write-Host ""

$useToken = Read-Host "Do you have a token ready? (y/n)"

if ($useToken -eq "y") {
    $token = Read-Host "Paste your JWT token"
} else {
    Write-Host ""
    Write-Host "Let's try logging in again..." -ForegroundColor Yellow
    Write-Host "Make sure to use the exact email and password" -ForegroundColor Gray
    Write-Host ""
    
    $email = Read-Host "Admin email"
    $password = Read-Host "Admin password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    $loginBody = @{
        email = $email
        password = $passwordPlain
    } | ConvertTo-Json
    
    Write-Host "Attempting login..." -ForegroundColor Gray
    
    try {
        $login = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
        
        if ($login.token) {
            Write-Host "SUCCESS: Logged in!" -ForegroundColor Green
            $token = $login.token
        } else {
            Write-Host "ERROR: No token received" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "ERROR: Login failed" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host ""
        Write-Host "Debug info:" -ForegroundColor Yellow
        Write-Host "URL: $BASE_URL/api/auth/login" -ForegroundColor Gray
        Write-Host "Email: $email" -ForegroundColor Gray
        exit 1
    }
}

# Execute Migration
Write-Host ""
Write-Host "Executing migration..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $migration = Invoke-RestMethod -Uri "$BASE_URL/api/forecasts/migrate-graph-table" -Method POST -Headers $headers -ErrorAction Stop
    
    Write-Host ""
    Write-Host "SUCCESS: Migration complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Table: $($migration.message)" -ForegroundColor White
    Write-Host ""
    Write-Host "Columns created:" -ForegroundColor White
    $migration.table_structure | ForEach-Object {
        Write-Host "  $($_.column_name) ($($_.data_type))" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "=== Next Steps ===" -ForegroundColor Cyan
    Write-Host "1. Go to Admin Panel > Forecasts" -ForegroundColor White
    Write-Host "2. Click 'Generate/Regenerate' button" -ForegroundColor White
    Write-Host "3. Wait 10-15 minutes for completion" -ForegroundColor White
    Write-Host "4. Click 'View Graph' on any barangay" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "Migration result:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Gray
    
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host ""
        Write-Host "INFO: Table already exists - Migration was already done!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can proceed to generate forecasts now." -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "ERROR: Migration failed" -ForegroundColor Red
    }
}
