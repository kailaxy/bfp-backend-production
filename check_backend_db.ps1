# Check what database the backend is connected to
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Database Connection Diagnostic ===`n"

# Login
Write-Host "Logging in..."
$loginBody = @{
    username = "admin"
    password = "bFpAdm#2025!xY"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Logged in`n"
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)"
    exit
}

# Check database info
Write-Host "Checking database connection and table status...`n"
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $dbInfo = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/debug/db-info" -Method GET -Headers $headers
    
    Write-Host "=== Database Information ===" -ForegroundColor Cyan
    Write-Host "Database Name: $($dbInfo.database)" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "=== Table Status ===" -ForegroundColor Cyan
    Write-Host "Table Exists: $($dbInfo.table.exists)"
    Write-Host "Record Count: $($dbInfo.table.recordCount)"
    Write-Host ""
    
    if ($dbInfo.table.exists) {
        Write-Host "=== Table Structure ===" -ForegroundColor Cyan
        $dbInfo.table.columns | ForEach-Object {
            Write-Host "  $($_.column_name): $($_.data_type)"
        }
        Write-Host ""
        
        if ($dbInfo.table.recordCount -gt 0) {
            Write-Host "=== Sample Data ===" -ForegroundColor Cyan
            $dbInfo.table.sampleData | ForEach-Object {
                Write-Host "  Barangay: $($_.barangay), Type: $($_.record_type), Date: $($_.date), Value: $($_.value)"
            }
        } else {
            Write-Host "⚠️  Table is empty!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Table does NOT exist in this database!" -ForegroundColor Red
        Write-Host ""
        Write-Host "This confirms the backend is connected to a different database"
        Write-Host "than the one where we created the table!"
    }
    
    Write-Host "`n=== Diagnostic Complete ===`n"
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    Write-Host $_.Exception
}
