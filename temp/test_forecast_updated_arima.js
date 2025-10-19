/**
 * TEST: Generate forecasts using updated ARIMA (log1p/expm1)
 * This is a TEMPORARY test - does NOT affect live database
 * Exports results to CSV for comparison with Colab
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection for fetching historical data
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testUpdatedARIMA() {
    console.log("=".repeat(80));
    console.log("TEST: Updated ARIMA (log1p/expm1) - NO DATABASE CHANGES");
    console.log("=".repeat(80));
    console.log("");

    try {
        // 1. Fetch historical data from database
        console.log("📊 Step 1: Fetching historical fire data...");
        const result = await pool.query(`
            SELECT 
                barangay,
                TO_CHAR(reported_at, 'YYYY-MM-DD') as date,
                1 as incident_count
            FROM historical_fires
            WHERE reported_at IS NOT NULL
            ORDER BY barangay, reported_at
        `);
        
        console.log(`   ✅ Fetched ${result.rows.length} historical records`);
        console.log("");

        // 2. Prepare input for Python script
        console.log("📝 Step 2: Preparing forecast input...");
        const inputData = {
            historical_data: result.rows,
            forecast_months: 15,  // Oct 2025 to Dec 2026
            target_date: '2026-12-01',
            forecast_start: '2025-10-01'
        };

        const inputFile = path.join(__dirname, 'test_arima_input.json');
        const outputFile = path.join(__dirname, 'test_arima_output.json');
        
        fs.writeFileSync(inputFile, JSON.stringify(inputData, null, 2));
        console.log(`   ✅ Input prepared: ${result.rows.length} records`);
        console.log(`   ✅ Forecast period: Oct 2025 - Dec 2026 (15 months)`);
        console.log("");

        // 3. Run Python forecasting script
        console.log("🐍 Step 3: Running updated ARIMA forecast...");
        console.log("   (Using log1p/expm1 transformation - matches Colab)");
        console.log("");

        const pythonScript = path.join(__dirname, '..', 'forecasting', 'arima_forecast_v2.py');
        const command = `py "${pythonScript}" "${inputFile}" "${outputFile}"`;
        
        const startTime = Date.now();
        execSync(command, { 
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log("");
        console.log(`   ✅ Forecast completed in ${duration}s`);
        console.log("");

        // 4. Load results
        console.log("📈 Step 4: Processing forecast results...");
        const output = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        
        console.log(`   ✅ Generated ${output.forecasts.length} forecasts`);
        console.log(`   ✅ Generated ${output.metadata.total_graph_records} graph records`);
        console.log(`   ✅ Transform method: ${output.metadata.transform_method}`);
        console.log(`   ✅ Random seed: ${output.metadata.random_seed}`);
        console.log("");

        // 5. Export to CSV (matching Colab format)
        console.log("💾 Step 5: Exporting to CSV...");
        
        // Sort by barangay, year, month
        const sortedForecasts = output.forecasts.sort((a, b) => {
            if (a.barangay !== b.barangay) return a.barangay.localeCompare(b.barangay);
            return new Date(a.forecast_month) - new Date(b.forecast_month);
        });

        // Create CSV header (matching Colab format)
        const csvLines = [
            'Barangay,Year,Month,Predicted_Cases,Lower_Bound,Upper_Bound,Risk_Level,MAE,RMSE,Model_Used'
        ];

        // Add data rows
        sortedForecasts.forEach(f => {
            const date = new Date(f.forecast_month);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            
            csvLines.push([
                f.barangay,
                year,
                month,
                f.predicted_cases.toFixed(6),
                f.lower_bound.toFixed(6),
                f.upper_bound.toFixed(6),
                f.risk_level,
                (f.mae || 0).toFixed(4),
                (f.rmse || 0).toFixed(4),
                f.model_used
            ].join(','));
        });

        const csvContent = csvLines.join('\n');
        const csvFile = path.join(__dirname, 'test_forecast_results_log1p.csv');
        fs.writeFileSync(csvFile, csvContent);
        
        console.log(`   ✅ CSV exported: ${csvFile}`);
        console.log(`   ✅ Total records: ${sortedForecasts.length}`);
        console.log("");

        // 6. Summary statistics
        console.log("=".repeat(80));
        console.log("FORECAST SUMMARY");
        console.log("=".repeat(80));
        console.log("");

        // Group by barangay
        const byBarangay = {};
        sortedForecasts.forEach(f => {
            if (!byBarangay[f.barangay]) {
                byBarangay[f.barangay] = {
                    forecasts: [],
                    model: f.model_used,
                    mae: f.mae || 0,
                    rmse: f.rmse || 0
                };
            }
            byBarangay[f.barangay].forecasts.push(f);
        });

        console.log(`Total Barangays: ${Object.keys(byBarangay).length}`);
        console.log(`Total Forecasts: ${sortedForecasts.length}`);
        console.log("");

        // Show sample results for first 5 barangays
        console.log("Sample Results (First 5 Barangays):");
        console.log("-".repeat(80));
        
        Object.keys(byBarangay).slice(0, 5).forEach(brg => {
            const data = byBarangay[brg];
            const avgPredicted = data.forecasts.reduce((sum, f) => sum + f.predicted_cases, 0) / data.forecasts.length;
            console.log(`${brg}:`);
            console.log(`  Model: ${data.model}`);
            console.log(`  MAE: ${data.mae.toFixed(4)}, RMSE: ${data.rmse.toFixed(4)}`);
            console.log(`  Avg Predicted: ${avgPredicted.toFixed(2)} fires/month`);
            console.log(`  Forecasts: Oct 2025 - Dec 2026 (${data.forecasts.length} months)`);
            console.log("");
        });

        console.log("=".repeat(80));
        console.log("✅ TEST COMPLETE - NO DATABASE CHANGES MADE");
        console.log("=".repeat(80));
        console.log("");
        console.log("📁 Output Files:");
        console.log(`   - Forecasts CSV: ${csvFile}`);
        console.log(`   - Full JSON: ${outputFile}`);
        console.log("");
        console.log("🔬 This forecast used:");
        console.log("   ✅ log1p/expm1 transformation (matches Colab)");
        console.log("   ✅ Proper CI handling");
        console.log("   ✅ MAE/RMSE on original scale");
        console.log("   ✅ Explicit SARIMAX testing");
        console.log("");
        console.log("Compare this CSV with your Colab results!");
        console.log("");

    } catch (error) {
        console.error("❌ Error:", error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the test
testUpdatedARIMA().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
