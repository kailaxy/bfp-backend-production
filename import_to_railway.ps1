# Import SQL dump to Railway database
Write-Host "`n=== Importing to Railway Database ===`n" -ForegroundColor Cyan

$railwayHost = "turntable.proxy.rlwy.net"
$railwayDb = "railway"
$railwayUser = "postgres"
$railwayPassword = "gtjgsixajmDAShmhwqFiqIlkLwuicgDT"
$railwayPort = "30700"

$inputFile = "render_db_export.sql"

if (-not (Test-Path $inputFile)) {
    Write-Host "❌ ERROR: $inputFile not found!" -ForegroundColor Red
    Write-Host "Please run .\export_render_db.ps1 first`n"
    exit 1
}

Write-Host "Importing to Railway PostgreSQL..." -ForegroundColor Yellow
Write-Host "Host: $railwayHost"
Write-Host "Database: $railwayDb"
Write-Host "Input: $inputFile`n"

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ ERROR: psql not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "psql is required to import the database."
    Write-Host "Please install PostgreSQL client tools:"
    Write-Host "  Download from: https://www.postgresql.org/download/windows/"
    Write-Host "  Or use: winget install PostgreSQL.PostgreSQL"
    Write-Host ""
    exit 1
}

Write-Host "Found psql: $($psqlPath.Source)`n"

# Set password as environment variable for psql
$env:PGPASSWORD = $railwayPassword

try {
    Write-Host "Starting import (this may take several minutes)...`n" -ForegroundColor Yellow
    Write-Host "⚠️  You may see some warnings - this is normal`n" -ForegroundColor Yellow
    
    # Import the SQL file
    & psql -h $railwayHost -p $railwayPort -U $railwayUser -d $railwayDb `
        -f $inputFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Import successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Verifying import..." -ForegroundColor Cyan
        
        # Count tables
        $countQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
        $result = & psql -h $railwayHost -p $railwayPort -U $railwayUser -d $railwayDb `
            -t -c $countQuery
        
        Write-Host "Tables imported: $($result.Trim())"
        
        # Check forecasts_graphs table
        $graphCountQuery = "SELECT COUNT(*) FROM forecasts_graphs;"
        $graphResult = & psql -h $railwayHost -p $railwayPort -U $railwayUser -d $railwayDb `
            -t -c $graphCountQuery 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "forecasts_graphs records: $($graphResult.Trim())`n"
        } else {
            Write-Host "forecasts_graphs table: Not found (will be created)`n"
        }
        
        Write-Host "✅ Database migration complete!`n" -ForegroundColor Green
        Write-Host "Next step: Test the backend and regenerate forecasts if needed`n"
        
    } else {
        Write-Host "`n❌ Import failed with exit code: $LASTEXITCODE`n" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`n❌ Import failed: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
