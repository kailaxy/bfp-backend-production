# Workspace Cleanup Script
# This script organizes and removes temporary files

Write-Host "Starting Workspace Cleanup..." -ForegroundColor Cyan
Write-Host ("=" * 80)

# Create archive directory for old files
$archiveDir = "archive/cleanup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null

# Files to remove (temporary test/diagnostic files)
$filesToRemove = @(
    "check_*.js",
    "check_*.ps1",
    "test_*.js",
    "test_*.ps1",
    "diagnose_*.js",
    "diagnose_*.ps1",
    "debug_*.ps1",
    "verify_*.js",
    "verify_*.ps1",
    "wait_for_*.ps1",
    "quick_*.ps1",
    "fix_*.js",
    "migrate_*.ps1",
    "execute_*.ps1",
    "export_*.ps1",
    "import_to_*.ps1",
    "query_*.ps1",
    "detailed_*.ps1",
    "extended_*.ps1",
    "final_*.ps1",
    "compare_*.js",
    "analyze_*.js",
    "process_*.js",
    "apply_schema.js",
    "clear_forecasts.js",
    "cleanup_extra_forecasts.js",
    "create_complete_dataset.js",
    "fill_missing_data.js",
    "proper_import.js",
    "regenerate_*.js",
    "remove_unknown_forecasts.js",
    "add_wack_wack_forecasts.js",
    "EMERGENCY_BACKUP.js",
    "migrate_datatoforecasts_to_db.js",
    "import_colab_*.js",
    "import_complete_dataset.js",
    "run_migration.js",
    "run_migration.ps1",
    "migrate_complete.js",
    "migrate_curl.ps1",
    "migrate_database.js",
    "migrate_db.js",
    "migrate_direct.js",
    "migrate_with_schema.js",
    "migrate_with_token.ps1",
    "migrate_via_backend.ps1",
    "direct_railway_migration.js",
    "direct_railway_migration.ps1",
    "temp_input.json"
)

$movedCount = 0
$errorCount = 0

foreach ($pattern in $filesToRemove) {
    $files = Get-ChildItem -Path . -Filter $pattern -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        try {
            Move-Item -Path $file.FullName -Destination $archiveDir -Force
            Write-Host "  Archived: $($file.Name)" -ForegroundColor Gray
            $movedCount++
        } catch {
            Write-Host "  Error moving: $($file.Name)" -ForegroundColor Yellow
            $errorCount++
        }
    }
}

# Archive old documentation files (keep only current ones)
$oldDocs = @(
    "CLEANUP_PLAN.md",
    "COLAB_IMPLEMENTATION_MATCH.md",
    "DATABASE_MIGRATION_GUIDE.md",
    "ESTIMATED_DAMAGE_FIX.md",
    "FORECAST_SETUP.md",
    "LOCAL_FORECAST_GENERATION.md",
    "LOCAL_FORECAST_GUIDE.md",
    "MIGRATION_GUIDE.md",
    "PHASE_2_COMPLETE.md",
    "PHASE_3_COMPLETE.md",
    "README_COLAB.md",
    "RAILWAY_DEPLOY.md",
    "RAILWAY_ENV_SETUP.md",
    "RAILWAY_FIX_DEPLOYED.md",
    "RAILWAY_MIGRATION_CHECKLIST.md",
    "RAILWAY_MIGRATION_VERIFICATION.md",
    "URGENT_DATABASE_MIGRATION.md"
)

foreach ($doc in $oldDocs) {
    if (Test-Path $doc) {
        try {
            Move-Item -Path $doc -Destination $archiveDir -Force
            Write-Host "  Archived doc: $doc" -ForegroundColor Gray
            $movedCount++
        } catch {
            Write-Host "  Error moving: $doc" -ForegroundColor Yellow
            $errorCount++
        }
    }
}

# Archive CSV files (keep only in data folder)
$csvFiles = Get-ChildItem -Path . -Filter "*.csv" -File
foreach ($csv in $csvFiles) {
    if ($csv.Name -ne "arima_historical_data.csv") {
        try {
            Move-Item -Path $csv.FullName -Destination $archiveDir -Force
            Write-Host "  Archived CSV: $($csv.Name)" -ForegroundColor Gray
            $movedCount++
        } catch {
            Write-Host "  Error moving: $($csv.Name)" -ForegroundColor Yellow
            $errorCount++
        }
    }
}

# Archive old emergency backup folder
if (Test-Path "emergency_backup_1760793198533") {
    try {
        Move-Item -Path "emergency_backup_1760793198533" -Destination $archiveDir -Force -Recurse
        Write-Host "  Archived: emergency_backup_1760793198533/" -ForegroundColor Gray
        $movedCount++
    } catch {
        Write-Host "  Error moving emergency backup folder" -ForegroundColor Yellow
        $errorCount++
    }
}

# Clean up temp directory
if (Test-Path "temp") {
    $tempFiles = Get-ChildItem -Path "temp" -File | Where-Object { $_.Name -ne ".gitkeep" }
    foreach ($tempFile in $tempFiles) {
        try {
            Move-Item -Path $tempFile.FullName -Destination $archiveDir -Force
            $movedCount++
        } catch {
            $errorCount++
        }
    }
    Write-Host "  Cleaned temp directory" -ForegroundColor Gray
}

Write-Host ""
Write-Host ("=" * 80)
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Files archived: $movedCount" -ForegroundColor White
Write-Host "  Errors: $errorCount" -ForegroundColor White
Write-Host "  Archive location: $archiveDir" -ForegroundColor White
Write-Host ""
Write-Host "Kept important files:" -ForegroundColor Cyan
Write-Host "  server.js, package.json" -ForegroundColor White
Write-Host "  config/, routes/, services/, middleware/" -ForegroundColor White
Write-Host "  railway_schema.sql" -ForegroundColor White
Write-Host "  arima_historical_data.csv" -ForegroundColor White
Write-Host "  Current documentation" -ForegroundColor White
Write-Host "  Migration scripts" -ForegroundColor White
Write-Host ""
Write-Host "Files can be recovered from: $archiveDir" -ForegroundColor Yellow
Write-Host ("=" * 80)
