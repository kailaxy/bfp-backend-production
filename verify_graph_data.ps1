# Check if graph data exists in the database
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host "`n=== Checking Graph Data in Database ===`n"

# Login
Write-Host "Logging in..."
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token

Write-Host "✅ Logged in`n"

# Check table status
Write-Host "Checking table status..."
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $tableCheck = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/table-check" -Method GET -Headers $headers
    Write-Host "✅ Table exists`n"
    Write-Host "Columns:"
    $tableCheck.columns | ForEach-Object {
        Write-Host "   - $($_.column_name): $($_.data_type)"
    }
} catch {
    Write-Host "❌ Table check failed: $($_.Exception.Message)"
}

# Try to get graph data for a barangay
Write-Host "`n=== Testing Graph Data Retrieval ===`n"

$testBarangays = @("Addition Hills", "Bangkal", "Bel-Air")

foreach ($barangay in $testBarangays) {
    Write-Host "Testing: $barangay"
    
    try {
        $encodedBarangay = [System.Web.HttpUtility]::UrlEncode($barangay)
        $graphUrl = "$baseUrl/api/forecasts/graphs/$encodedBarangay"
        
        $graphData = Invoke-RestMethod -Uri $graphUrl -Method GET -Headers $headers
        
        if ($graphData.datasets -and $graphData.datasets.Count -gt 0) {
            Write-Host "   ✅ SUCCESS: Found $($graphData.totalRecords) records"
            Write-Host "   Datasets available:"
            $graphData.datasets | ForEach-Object {
                Write-Host "      - $($_.label): $($_.count) data points"
            }
        } else {
            Write-Host "   ⚠️  No datasets found"
        }
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   ❌ Error $statusCode : $($_.Exception.Message)"
    }
    
    Write-Host ""
}

# Direct database count check
Write-Host "=== Direct Database Count ===`n"

Write-Host "Checking total records in forecasts_graphs table..."
Write-Host "(This uses the diagnostic endpoint)`n"

try {
    $countResponse = Invoke-RestMethod -Uri "$baseUrl/api/forecasts/table-check" -Method GET -Headers $headers
    Write-Host "Table exists with $($countResponse.columns.Count) columns"
    Write-Host "`nNote: This endpoint doesn't show row count."
    Write-Host "If graph data retrieval above shows 0 records for all barangays,"
    Write-Host "then the table is empty despite successful forecast generation.`n"
} catch {
    Write-Host "Could not check table: $($_.Exception.Message)`n"
}

Write-Host "=== Check Complete ===`n"
