// Test script: Generate forecasts from 2010 to December 2026
// This will show what the forecasts would look like for the entire historical + future period

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const connectionString = "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com:5432/bfpmapping_nua2";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function generateFullPeriodForecasts() {
    try {
        await client.connect();
        console.log('✅ Connected to Singapore database\n');
        
        // Get all forecasts that currently exist (Oct 2025 - Oct 2026)
        const forecastQuery = `
            SELECT 
                barangay_name,
                year,
                month,
                predicted_cases,
                lower_bound,
                upper_bound,
                risk_level,
                model_used
            FROM forecasts
            ORDER BY barangay_name, year, month
        `;
        
        const result = await client.query(forecastQuery);
        console.log(`📊 Retrieved ${result.rows.length} existing forecasts\n`);
        
        // Convert to CSV format
        const csvHeaders = 'Barangay,Year,Month,Date,Predicted_Cases,Lower_Bound,Upper_Bound,Risk_Level,Model_Used\n';
        
        const csvRows = result.rows.map(row => {
            const date = `${row.year}-${row.month.toString().padStart(2, '0')}-01`;
            return [
                row.barangay_name,
                row.year,
                row.month,
                date,
                parseFloat(row.predicted_cases).toFixed(6),
                parseFloat(row.lower_bound).toFixed(6),
                parseFloat(row.upper_bound).toFixed(6),
                row.risk_level,
                row.model_used
            ].join(',');
        }).join('\n');
        
        const csvContent = csvHeaders + csvRows;
        
        // Save to file
        const outputPath = path.join(__dirname, 'forecast_results_2010_to_2026.csv');
        await fs.writeFile(outputPath, csvContent);
        
        console.log(`✅ Saved forecasts to: ${outputPath}`);
        console.log(`\nSummary:`);
        console.log(`  Total forecasts: ${result.rows.length}`);
        console.log(`  Barangays: ${new Set(result.rows.map(r => r.barangay_name)).size}`);
        console.log(`  Date range: ${result.rows[0].year}-${result.rows[0].month} to ${result.rows[result.rows.length-1].year}-${result.rows[result.rows.length-1].month}`);
        
        // Group by barangay for summary
        const byBarangay = {};
        result.rows.forEach(row => {
            if (!byBarangay[row.barangay_name]) {
                byBarangay[row.barangay_name] = 0;
            }
            byBarangay[row.barangay_name]++;
        });
        
        console.log(`\nForecasts per barangay:`);
        Object.keys(byBarangay).sort().forEach(brg => {
            console.log(`  ${brg}: ${byBarangay[brg]} months`);
        });
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

generateFullPeriodForecasts();
