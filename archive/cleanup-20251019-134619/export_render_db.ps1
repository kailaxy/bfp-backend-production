# Export Render database to SQL file
Write-Host "`n=== Exporting Render Database ===`n" -ForegroundColor Cyan

$renderHost = "dpg-d35r1s2li9vc73819f70-a.oregon-postgres.render.com"
$renderDb = "bfpmapping_nua2"
$renderUser = "bfpmapping_nua2_user"
$renderPassword = "mDB9Q1s6mnnTyXGgzqSMD5CTpHUsvR6L"
$renderPort = "5432"

$outputFile = "render_db_export.sql"

Write-Host "Exporting from Render PostgreSQL..." -ForegroundColor Yellow
Write-Host "Host: $renderHost"
Write-Host "Database: $renderDb"
Write-Host "Output: $outputFile`n"

# Check if pg_dump is available
$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue

if (-not $pgDumpPath) {
    Write-Host "❌ ERROR: pg_dump not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "pg_dump is required to export the database."
    Write-Host "Please install PostgreSQL client tools:"
    Write-Host "  Download from: https://www.postgresql.org/download/windows/"
    Write-Host "  Or use: winget install PostgreSQL.PostgreSQL"
    Write-Host ""
    Write-Host "After installation, add PostgreSQL bin directory to PATH."
    Write-Host ""
    exit 1
}

Write-Host "Found pg_dump: $($pgDumpPath.Source)`n"

# Set password as environment variable for pg_dump
$env:PGPASSWORD = $renderPassword

try {
    Write-Host "Starting export (this may take a few minutes)...`n"
    
    # Export with schema and data
    & pg_dump -h $renderHost -p $renderPort -U $renderUser -d $renderDb `
        --no-owner --no-acl --clean --if-exists `
        -f $outputFile
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $outputFile).Length / 1MB
        Write-Host "`n✅ Export successful!" -ForegroundColor Green
        Write-Host "File: $outputFile"
        Write-Host "Size: $([math]::Round($fileSize, 2)) MB`n"
    } else {
        Write-Host "`n❌ Export failed with exit code: $LASTEXITCODE`n" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`n❌ Export failed: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "Next step: Import this file to Railway database"
Write-Host "Run: .\import_to_railway.ps1`n"
