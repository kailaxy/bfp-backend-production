# Direct database query to check historical_fires structure
$baseUrl = "https://bfp-backend-production.up.railway.app"

Write-Host ""
Write-Host "=== Diagnosing Historical Fires Query Issue ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "You said: 1,299 records in historical_fires" -ForegroundColor Yellow
Write-Host "Forecast service sees: 0 barangay-month records (inferred from fast completion)" -ForegroundColor Yellow
Write-Host ""

# Login
$loginBody = '{"username":"admin","password":"bFpAdm#2025!xY"}'
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "The forecast service query is:" -ForegroundColor Cyan
Write-Host @"
  SELECT 
    barangay,
    TO_CHAR(reported_at, 'YYYY-MM') as date,
    COUNT(*) as incident_count
  FROM historical_fires
  WHERE barangay IS NOT NULL 
    AND barangay != ''
    AND reported_at IS NOT NULL
  GROUP BY barangay, TO_CHAR(reported_at, 'YYYY-MM')
"@ -ForegroundColor Gray

Write-Host ""
Write-Host "Possible reasons this returns 0 rows:" -ForegroundColor Yellow
Write-Host "  1. All 1,299 records have NULL reported_at dates" -ForegroundColor White
Write-Host "  2. All 1,299 records have NULL/empty barangay" -ForegroundColor White
Write-Host "  3. Column is named differently (fire_date not reported_at)" -ForegroundColor White
Write-Host "  4. Different database/schema than admin panel" -ForegroundColor White
Write-Host ""

Write-Host "=== SOLUTION ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "We need to check the ACTUAL column names in your historical_fires table." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please check in your admin panel:" -ForegroundColor White
Write-Host "  1. What is the DATE column called?" -ForegroundColor Cyan
Write-Host "     Options: reported_at, fire_date, incident_date, date, etc." -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Do the records have barangay names filled in?" -ForegroundColor Cyan
Write-Host "     (Not NULL/empty)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Do the records have dates filled in?" -ForegroundColor Cyan
Write-Host "     (Not NULL)" -ForegroundColor Gray
Write-Host ""
Write-Host "Once you confirm the actual column name, I can update the query!" -ForegroundColor Green
Write-Host ""
