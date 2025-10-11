# Regenerate Forecasts with Graph Data
$BASE_URL = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== BFP Forecast Regeneration ===" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'

$loginResponse = Invoke-WebRequest -Uri "$BASE_URL/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody `
    -UseBasicParsing

$login = $loginResponse.Content | ConvertFrom-Json
$token = $login.token

Write-Host "SUCCESS: Logged in" -ForegroundColor Green
Write-Host ""

# Generate forecasts
Write-Host "Step 2: Starting forecast generation..." -ForegroundColor Yellow
Write-Host "This will take 10-15 minutes. Please wait..." -ForegroundColor Gray
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$startTime = Get-Date

try {
    $generateResponse = Invoke-WebRequest -Uri "$BASE_URL/api/forecasts/generate-enhanced" `
        -Method POST `
        -Headers $headers `
        -UseBasicParsing `
        -TimeoutSec 1200
    
    $result = $generateResponse.Content | ConvertFrom-Json
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMinutes
    
    Write-Host ""
    Write-Host "=== FORECAST GENERATION COMPLETE ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results:" -ForegroundColor White
    Write-Host "  Barangays processed: $($result.metadata.barangays_processed)" -ForegroundColor Gray
    Write-Host "  Forecasts generated: $($result.metadata.forecasts_generated)" -ForegroundColor Gray
    Write-Host "  Graph records stored: $($result.metadata.graph_records_stored)" -ForegroundColor Gray
    Write-Host "  Successful forecasts: $($result.metadata.successful_forecasts)" -ForegroundColor Gray
    Write-Host "  Duration: $([math]::Round($duration, 1)) minutes" -ForegroundColor Gray
    Write-Host ""
    
    if ($result.metadata.graph_records_stored -gt 0) {
        Write-Host "SUCCESS: Graph data was stored!" -ForegroundColor Green
        Write-Host "You can now use 'View Graph' in the admin panel." -ForegroundColor White
    } else {
        Write-Host "WARNING: No graph data was stored!" -ForegroundColor Yellow
        Write-Host "This might indicate an issue with the Python script." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Next: Go to Admin Panel and click 'View Graph' on any barangay" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERROR: Forecast generation failed" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Gray
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Gray
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Gray
        } catch {
            # Ignore read errors
        }
    }
}
