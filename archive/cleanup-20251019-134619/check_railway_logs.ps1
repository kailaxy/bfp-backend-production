# Check Railway logs for graph data information
Write-Host "`n=== Checking Railway Backend Logs ===`n"

Write-Host "Please check your Railway dashboard for the latest logs:"
Write-Host "https://railway.app/project/<your-project-id>/service/<backend-service-id>/deployments`n"

Write-Host "Look for these log lines after forecast generation:"
Write-Host "  - 'Graph data records: X'"
Write-Host "  - 'Graph data sample: {...}'"
Write-Host "  - 'Total graph records: X'"
Write-Host "  - 'WARNING: graph_data is missing from Python output!'"
Write-Host ""

Write-Host "Alternatively, let me check the database directly to see if data was stored...`n"

# Run the direct database check
node check_graph_data_direct.js
