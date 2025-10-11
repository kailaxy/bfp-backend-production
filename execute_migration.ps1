# BFP Migration Executor - PowerShell Script
# This script will help you execute the forecasts_graphs table migration

$BASE_URL = "https://bfp-backend-production.up.railway.app"

Write-Host "`n🚀 BFP Migration Executor`n" -ForegroundColor Cyan
Write-Host "This script will:" -ForegroundColor White
Write-Host "1. Log you in as admin" -ForegroundColor White
Write-Host "2. Execute the forecasts_graphs table migration" -ForegroundColor White
Write-Host "3. (Optional) Test the GET endpoint`n" -ForegroundColor White

$continue = Read-Host "Continue? (y/n)"
if ($continue -ne "y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit
}

# Step 1: Get Admin Token
Write-Host "`n🔐 Step 1: Getting admin JWT token...`n" -ForegroundColor Cyan

$email = Read-Host "Enter admin email"
$password = Read-Host "Enter admin password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$loginBody = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    Write-Host "Logging in..." -ForegroundColor Yellow
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.token) {
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "👤 User: $($loginResponse.user.email)" -ForegroundColor White
        Write-Host "🔑 Token obtained`n" -ForegroundColor White
        $token = $loginResponse.token
    } else {
        Write-Host "❌ Login failed: $($loginResponse.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login request failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Execute Migration
Write-Host "`n📊 Step 2: Executing forecasts_graphs table migration...`n" -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    Write-Host "Creating forecasts_graphs table..." -ForegroundColor Yellow
    $migrationResponse = Invoke-RestMethod -Uri "$BASE_URL/api/forecasts/migrate-graph-table" -Method POST -Headers $headers
    
    if ($migrationResponse.success) {
        Write-Host "✅ Migration successful!" -ForegroundColor Green
        Write-Host "📋 Message: $($migrationResponse.message)" -ForegroundColor White
        Write-Host "`n📊 Table Structure:" -ForegroundColor White
        foreach ($col in $migrationResponse.table_structure) {
            Write-Host "   - $($col.column_name): $($col.data_type)" -ForegroundColor Gray
        }
        Write-Host ""
    } else {
        Write-Host "❌ Migration failed: $($migrationResponse.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    $errorMessage = $_.Exception.Message
    if ($errorMessage -like "*already exists*") {
        Write-Host "[INFO] Table already exists - this is OK!" -ForegroundColor Yellow
    } else {
        Write-Host "[ERROR] Migration request failed: $errorMessage" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Test GET Endpoint (Optional)
Write-Host "`n📈 Step 3: Testing GET endpoint (optional)...`n" -ForegroundColor Cyan

$testEndpoint = Read-Host "Test GET endpoint now? (y/n)"

if ($testEndpoint -eq "y") {
    $barangay = Read-Host "Enter barangay name (or press Enter for 'Addition Hills')"
    if ([string]::IsNullOrWhiteSpace($barangay)) {
        $barangay = "Addition Hills"
    }
    
    $encodedBarangay = [System.Web.HttpUtility]::UrlEncode($barangay)
    
    try {
        Write-Host "`nFetching graph data for $barangay..." -ForegroundColor Yellow
        $graphResponse = Invoke-RestMethod -Uri "$BASE_URL/api/forecasts/graphs/$encodedBarangay" -Method GET -Headers $headers
        
        if ($graphResponse.success) {
            Write-Host "`n✅ Graph endpoint working!" -ForegroundColor Green
            Write-Host "`n📊 Metadata:" -ForegroundColor White
            Write-Host "   - Barangay: $($graphResponse.barangay)" -ForegroundColor Gray
            Write-Host "   - Total records: $($graphResponse.metadata.total_records)" -ForegroundColor Gray
            Write-Host "   - Date range: $($graphResponse.metadata.date_range.start) to $($graphResponse.metadata.date_range.end)" -ForegroundColor Gray
            Write-Host "`n📈 Dataset counts:" -ForegroundColor White
            Write-Host "   - Actual: $($graphResponse.metadata.datasets.actual)" -ForegroundColor Gray
            Write-Host "   - Fitted: $($graphResponse.metadata.datasets.fitted)" -ForegroundColor Gray
            Write-Host "   - Forecast: $($graphResponse.metadata.datasets.forecast)" -ForegroundColor Gray
            Write-Host "   - CI Lower: $($graphResponse.metadata.datasets.ci_lower)" -ForegroundColor Gray
            Write-Host "   - CI Upper: $($graphResponse.metadata.datasets.ci_upper)" -ForegroundColor Gray
            Write-Host "   - Moving Avg: $($graphResponse.metadata.datasets.moving_avg_6)" -ForegroundColor Gray
        } else {
            Write-Host "`n❌ Graph endpoint failed" -ForegroundColor Red
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host "`nℹ️  No graph data found. You need to generate forecasts first." -ForegroundColor Yellow
            Write-Host "   Go to Admin Panel → Forecasts → 'Generate/Regenerate' button" -ForegroundColor Yellow
        } else {
            Write-Host "`n❌ Graph endpoint request failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "⏭️  Skipping endpoint test." -ForegroundColor Yellow
}

# Summary
Write-Host "`n🎉 Migration complete!`n" -ForegroundColor Green
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Generate forecasts: Admin Panel → Forecasts → 'Generate/Regenerate'" -ForegroundColor White
Write-Host "2. Wait 10-15 minutes for generation to complete" -ForegroundColor White
Write-Host "3. Click 'View Graph' on any barangay to see visualization`n" -ForegroundColor White
