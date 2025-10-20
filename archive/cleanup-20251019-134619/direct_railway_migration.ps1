# Direct Railway Database Migration
# This script connects directly to Railway PostgreSQL and creates the table

Write-Host ""
Write-Host "=== Direct Railway Database Migration ===" -ForegroundColor Cyan
Write-Host ""

$PGHOST = "turntable.proxy.rlwy.net"
$PGPORT = "30700"
$PGDATABASE = Read-Host "Enter database name (usually 'railway')"
$PGUSER = Read-Host "Enter database username (usually 'postgres')"
$PGPASSWORD = Read-Host "Enter database password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($PGPASSWORD)
$PGPASSWORD_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Connecting to Railway database..." -ForegroundColor Yellow
Write-Host "Host: $PGHOST" -ForegroundColor Gray
Write-Host "Port: $PGPORT" -ForegroundColor Gray
Write-Host "Database: $PGDATABASE" -ForegroundColor Gray
Write-Host ""

# Read the SQL migration file
$sqlFile = "migrations/create_forecasts_graphs_table.sql"
$sql = Get-Content $sqlFile -Raw

Write-Host "SQL Migration loaded ($($sql.Length) characters)" -ForegroundColor Gray
Write-Host ""

# Set environment variables for psql
$env:PGPASSWORD = $PGPASSWORD_PLAIN

# Execute SQL using psql
Write-Host "Executing migration..." -ForegroundColor Yellow

$command = @"
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "$($sql -replace '"','\"')"
"@

try {
    $result = Invoke-Expression "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f $sqlFile" 2>&1
    
    Write-Host ""
    Write-Host "Result:" -ForegroundColor White
    Write-Host $result
    Write-Host ""
    
    # Verify table creation
    Write-Host "Verifying table creation..." -ForegroundColor Yellow
    $verifyResult = Invoke-Expression "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c 'SELECT COUNT(*) FROM forecasts_graphs;'" 2>&1
    
    if ($verifyResult -like "*0*") {
        Write-Host "SUCCESS: Table exists!" -ForegroundColor Green
        Write-Host "Table is empty (0 records) - ready for forecast generation" -ForegroundColor White
    } elseif ($verifyResult -like "*error*") {
        Write-Host "ERROR: Table verification failed" -ForegroundColor Red
        Write-Host $verifyResult -ForegroundColor Gray
    } else {
        Write-Host "SUCCESS: Table exists with data!" -ForegroundColor Green
        Write-Host $verifyResult -ForegroundColor Gray
    }
    
} catch {
    Write-Host "ERROR: Migration failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "=== Migration Complete ===" -ForegroundColor Cyan
Write-Host ""
