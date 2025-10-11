# Test debug/db-info endpoint
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Testing Debug DB Info Endpoint ===`n"

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token

Write-Host "✅ Logged in`n"

$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/debug/db-info" -Method GET -Headers $headers
    
    Write-Host "✅ Database: $($response.database)`n"
    Write-Host "Table forecasts_graphs:"
    Write-Host "  Exists: $($response.table.exists)"
    Write-Host "  Records: $($response.table.recordCount)`n"
    
    if ($response.table.recordCount -gt 0) {
        Write-Host "Sample data:"
        $response.table.sampleData | ForEach-Object {
            Write-Host "  - $($_.barangay), $($_.record_type), $($_.date): $($_.value)"
        }
    }
    
    Write-Host ""
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    Write-Host $_.Exception
}
