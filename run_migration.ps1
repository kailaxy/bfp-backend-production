# Simple Migration Executor
$BASE_URL = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== BFP Migration Executor ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login
Write-Host "Step 1: Login" -ForegroundColor Yellow
$email = Read-Host "Admin email"
$password = Read-Host "Admin password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$loginBody = "{`"email`":`"$email`",`"password`":`"$passwordPlain`"}"

Write-Host "Logging in..." -ForegroundColor Gray
$login = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"

if (-not $login.token) {
    Write-Host "ERROR: Login failed" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: Logged in as $($login.user.email)" -ForegroundColor Green
$token = $login.token

# Step 2: Execute Migration
Write-Host ""
Write-Host "Step 2: Execute Migration" -ForegroundColor Yellow
Write-Host "Creating forecasts_graphs table..." -ForegroundColor Gray

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $migration = Invoke-RestMethod -Uri "$BASE_URL/api/forecasts/migrate-graph-table" -Method POST -Headers $headers -ErrorAction Stop
    
    if ($migration.success) {
        Write-Host "SUCCESS: Migration complete!" -ForegroundColor Green
        Write-Host "Message: $($migration.message)" -ForegroundColor White
        Write-Host ""
        Write-Host "Table columns created:" -ForegroundColor White
        $migration.table_structure | ForEach-Object {
            Write-Host "  - $($_.column_name): $($_.data_type)" -ForegroundColor Gray
        }
    }
} catch {
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "INFO: Table already exists (this is OK)" -ForegroundColor Yellow
    } else {
        Write-Host "ERROR: Migration failed" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}

# Step 3: Optional Test
Write-Host ""
Write-Host "Step 3: Test Endpoint (Optional)" -ForegroundColor Yellow
$doTest = Read-Host "Test the GET endpoint? (y/n)"

if ($doTest -eq "y") {
    $barangayInput = Read-Host "Barangay name (or press Enter for 'Addition Hills')"
    $barangay = if ($barangayInput) { $barangayInput } else { "Addition Hills" }
    
    $encoded = [uri]::EscapeDataString($barangay)
    
    try {
        $graph = Invoke-RestMethod -Uri "$BASE_URL/api/forecasts/graphs/$encoded" -Method GET -Headers $headers -ErrorAction Stop
        
        Write-Host ""
        Write-Host "SUCCESS: Graph data retrieved!" -ForegroundColor Green
        Write-Host "Barangay: $($graph.barangay)" -ForegroundColor White
        Write-Host "Total records: $($graph.metadata.total_records)" -ForegroundColor White
        Write-Host "Datasets:" -ForegroundColor White
        Write-Host "  - Actual: $($graph.metadata.datasets.actual)" -ForegroundColor Gray
        Write-Host "  - Fitted: $($graph.metadata.datasets.fitted)" -ForegroundColor Gray
        Write-Host "  - Forecast: $($graph.metadata.datasets.forecast)" -ForegroundColor Gray
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host "INFO: No graph data yet. Generate forecasts first." -ForegroundColor Yellow
        } else {
            Write-Host "ERROR: Test failed - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== Migration Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to Admin Panel > Forecasts" -ForegroundColor White
Write-Host "2. Click 'Generate/Regenerate' button" -ForegroundColor White
Write-Host "3. Wait 10-15 minutes" -ForegroundColor White
Write-Host "4. Click 'View Graph' on any barangay" -ForegroundColor White
Write-Host ""
