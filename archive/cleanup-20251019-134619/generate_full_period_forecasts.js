// Test script: Generate forecasts from 2010 to December 2026
// This simulates what would be stored in the forecasts table
// Format matches the forecasts database table structure

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const client = new Client({
    connectionString: "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com:5432/bfpmapping_nua2",
    ssl: { rejectUnauthorized: false }
});

async function generateHistoricalForecasts() {
    try {
        await client.connect();
        console.log('✅ Connected to database\n');
        console.log('📊 Generating forecasts from 2010 to December 2026...\n');
        
        // For this test, we'll use the fitted values from forecasts_graphs as "forecasts" for historical period
        // and actual forecasts for future period
        
        // Get fitted values for 2010-2025 (these are the model's predictions for historical data)
        const fittedQuery = `
            SELECT 
                barangay,
                date,
                value as predicted_cases
            FROM forecasts_graphs
            WHERE record_type = 'fitted'
            ORDER BY barangay, date
        `;
        
        console.log('Fetching fitted values for historical period...');
        const fittedResult = await client.query(fittedQuery);
        console.log(`✅ Retrieved ${fittedResult.rows.length} fitted value records\n`);
        
        // Get actual forecasts for future period (2025-2026)
        const forecastQuery = `
            SELECT 
                barangay_name as barangay,
                year,
                month,
                predicted_cases,
                lower_bound,
                upper_bound,
                risk_level,
                risk_flag,
                model_used,
                confidence_interval
            FROM forecasts
            ORDER BY barangay_name, year, month
        `;
        
        console.log('Fetching future forecasts...');
        const forecastResult = await client.query(forecastQuery);
        console.log(`✅ Retrieved ${forecastResult.rows.length} future forecast records\n`);
        
        // Combine into single dataset
        const allForecasts = [];
        
        // Add fitted values as "forecasts" for historical period (2010-2025)
        fittedResult.rows.forEach(row => {
            const date = new Date(row.date);
            allForecasts.push({
                barangay: row.barangay,
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                forecast_month: row.date.toISOString().split('T')[0],
                predicted_cases: parseFloat(row.predicted_cases),
                lower_bound: null, // Fitted values don't have confidence intervals
                upper_bound: null,
                risk_level: categorizeRisk(parseFloat(row.predicted_cases)),
                risk_flag: parseFloat(row.predicted_cases) > 2.0,
                model_used: 'SARIMAX (fitted)',
                confidence_interval: null,
                period_type: 'historical_fitted'
            });
        });
        
        // Add actual forecasts for future period (Oct 2025 - Oct 2026)
        forecastResult.rows.forEach(row => {
            const forecast_month = `${row.year}-${row.month.toString().padStart(2, '0')}-01`;
            allForecasts.push({
                barangay: row.barangay,
                year: row.year,
                month: row.month,
                forecast_month: forecast_month,
                predicted_cases: parseFloat(row.predicted_cases),
                lower_bound: parseFloat(row.lower_bound),
                upper_bound: parseFloat(row.upper_bound),
                risk_level: row.risk_level,
                risk_flag: row.risk_flag,
                model_used: row.model_used,
                confidence_interval: row.confidence_interval,
                period_type: 'future_forecast'
            });
        });
        
        // Add synthetic forecasts for Nov 2026 - Dec 2026 (to reach December 2026)
        console.log('Generating synthetic forecasts for Nov-Dec 2026...');
        const barangays = [...new Set(forecastResult.rows.map(r => r.barangay))];
        
        barangays.forEach(barangay => {
            // Get last forecast for this barangay (Oct 2026)
            const lastForecast = forecastResult.rows
                .filter(r => r.barangay === barangay)
                .sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return b.month - a.month;
                })[0];
            
            if (lastForecast) {
                // Extrapolate for Nov and Dec 2026
                [11, 12].forEach(month => {
                    const forecast_month = `2026-${month.toString().padStart(2, '0')}-01`;
                    allForecasts.push({
                        barangay: barangay,
                        year: 2026,
                        month: month,
                        forecast_month: forecast_month,
                        predicted_cases: parseFloat(lastForecast.predicted_cases), // Use same value as Oct
                        lower_bound: parseFloat(lastForecast.lower_bound) - 0.05, // Slightly widen CI
                        upper_bound: parseFloat(lastForecast.upper_bound) + 0.05,
                        risk_level: lastForecast.risk_level,
                        risk_flag: lastForecast.risk_flag,
                        model_used: lastForecast.model_used + ' (extrapolated)',
                        confidence_interval: lastForecast.confidence_interval,
                        period_type: 'future_extrapolated'
                    });
                });
            }
        });
        
        console.log(`✅ Generated ${allForecasts.length} total forecast records\n`);
        
        // Sort by barangay, year, month
        allForecasts.sort((a, b) => {
            if (a.barangay !== b.barangay) return a.barangay.localeCompare(b.barangay);
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });
        
        // Export to CSV (matching forecasts table structure)
        const csvHeaders = 'Barangay,Year,Month,Forecast_Month,Predicted_Cases,Lower_Bound,Upper_Bound,Risk_Level,Risk_Flag,Model_Used,Confidence_Interval,Period_Type\n';
        
        const csvRows = allForecasts.map(row => {
            return [
                row.barangay,
                row.year,
                row.month,
                row.forecast_month,
                row.predicted_cases !== null ? row.predicted_cases.toFixed(6) : '',
                row.lower_bound !== null ? row.lower_bound.toFixed(6) : '',
                row.upper_bound !== null ? row.upper_bound.toFixed(6) : '',
                row.risk_level,
                row.risk_flag !== null ? row.risk_flag : '',
                row.model_used || '',
                row.confidence_interval || '',
                row.period_type
            ].join(',');
        }).join('\n');
        
        const csvContent = csvHeaders + csvRows;
        
        // Save to file
        const outputPath = path.join(__dirname, 'forecasts_2010_to_dec2026.csv');
        await fs.writeFile(outputPath, csvContent);
        
        console.log(`✅ Saved forecasts to: ${outputPath}`);
        console.log(`\nFile size: ${(csvContent.length / 1024).toFixed(2)} KB`);
        console.log(`Total records: ${allForecasts.length}`);
        
        // Summary statistics
        console.log(`\n📈 Summary:`);
        console.log(`  Barangays: ${barangays.length}`);
        console.log(`  Date range: 2010-05 to 2026-12`);
        
        // Count by period type
        const byPeriod = {};
        allForecasts.forEach(row => {
            byPeriod[row.period_type] = (byPeriod[row.period_type] || 0) + 1;
        });
        
        console.log(`\n  Records by period:`);
        Object.keys(byPeriod).sort().forEach(type => {
            console.log(`    ${type}: ${byPeriod[type]}`);
        });
        
        console.log(`\n✅ Test complete!`);
        console.log(`\nThis CSV shows what the forecasts table would look like`);
        console.log(`if we stored fitted values for 2010-2025 and forecasts for 2025-2026.`);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err.stack);
    } finally {
        await client.end();
    }
}

function categorizeRisk(predicted_cases) {
    if (predicted_cases < 0.3) return 'Very Low';
    if (predicted_cases < 0.7) return 'Low';
    if (predicted_cases < 1.5) return 'Medium';
    if (predicted_cases < 3.0) return 'High';
    return 'Very High';
}

generateHistoricalForecasts();
