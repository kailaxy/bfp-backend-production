# Create table through backend connection (not direct connection)
$BASE_URL = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Creating forecasts_graphs Table via Backend API ===`n"

# Login
Write-Host "Step 1: Logging in..."
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'

$loginResponse = Invoke-WebRequest -Uri "$BASE_URL/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody `
    -UseBasicParsing

$login = $loginResponse.Content | ConvertFrom-Json
$token = $login.token

Write-Host "✅ Logged in`n"

# Run migration
Write-Host "Step 2: Running migration..."
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/forecasts/migrate-graph-table" `
        -Method POST `
        -Headers $headers `
        -UseBasicParsing
    
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Migration successful!`n"
    Write-Host "Table structure:"
    $result.table.columns | ForEach-Object {
        Write-Host "  - $($_.column_name): $($_.data_type)"
    }
    
    Write-Host "`n✅ Table created successfully in the backend's database!`n"
    
} catch {
    Write-Host "❌ Migration failed: $($_.Exception.Message)"
    Write-Host $_.Exception
}
