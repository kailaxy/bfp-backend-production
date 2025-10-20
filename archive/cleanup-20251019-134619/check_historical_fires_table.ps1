# Check historical_fires table directly through database query endpoint
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Checking Historical Fires Table ===" -ForegroundColor Cyan
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "Querying historical_fires table..." -ForegroundColor Yellow
Write-Host ""

# Use the health endpoint to run a custom query
try {
    # Try to get table info through the debug endpoint
    $query = @{
        query = "SELECT COUNT(*) as total FROM historical_fires"
    } | ConvertTo-Json
    
    # First, let's just check what endpoints are available for historical fires
    Write-Host "Checking available routes..." -ForegroundColor Gray
    
    # Try different possible endpoints
    $endpoints = @(
        "/api/historical-fires",
        "/api/historical_fires",
        "/api/incidents/history",
        "/api/incidents-history"
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            Write-Host "  Trying: $endpoint" -ForegroundColor Gray
            $response = Invoke-RestMethod -Uri "$baseUrl$endpoint" -Method GET -Headers $headers -ErrorAction Stop
            Write-Host "    SUCCESS! Found endpoint" -ForegroundColor Green
            Write-Host "    Response type: $($response.GetType().Name)" -ForegroundColor Gray
            
            if ($response -is [Array]) {
                Write-Host "    Record count: $($response.Count)" -ForegroundColor White
                if ($response.Count -gt 0) {
                    Write-Host ""
                    Write-Host "    Sample record:" -ForegroundColor Yellow
                    $response[0] | ConvertTo-Json -Depth 2 | Write-Host -ForegroundColor Gray
                }
            } elseif ($response.PSObject.Properties['total']) {
                Write-Host "    Total: $($response.total)" -ForegroundColor White
            } else {
                $response | ConvertTo-Json -Depth 2 | Write-Host -ForegroundColor Gray
            }
            Write-Host ""
            break
        } catch {
            Write-Host "    Not found" -ForegroundColor DarkGray
        }
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Manual Check ===" -ForegroundColor Cyan
Write-Host "Since you mentioned you saw records in the admin panel:" -ForegroundColor Yellow
Write-Host "  1. How many historical fire records do you see?" -ForegroundColor White
Write-Host "  2. What date range do they cover?" -ForegroundColor White
Write-Host "  3. Do they have a 'reported_at' or 'fire_date' column?" -ForegroundColor White
Write-Host ""
