// Export complete historical + forecast data to CSV (2010 - Dec 2026)
// This creates a comprehensive CSV showing actual fires, model fitted values, and forecasts

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const client = new Client({
    connectionString: "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com:5432/bfpmapping_nua2",
    ssl: { rejectUnauthorized: false }
});

async function exportCompleteData() {
    try {
        await client.connect();
        console.log('✅ Connected to database\n');
        console.log('📊 Fetching complete dataset (2010 - 2026)...\n');
        
        // Get all graph data for comprehensive view
        const graphQuery = `
            SELECT 
                barangay,
                record_type,
                date,
                value
            FROM forecasts_graphs
            WHERE barangay = 'Addition Hills'  -- Start with one barangay for testing
            ORDER BY record_type, date
        `;
        
        const allBarangaysQuery = `
            SELECT 
                barangay,
                record_type,
                date,
                value
            FROM forecasts_graphs
            ORDER BY barangay, date, record_type
        `;
        
        console.log('Fetching data for all barangays...');
        const result = await client.query(allBarangaysQuery);
        console.log(`✅ Retrieved ${result.rows.length} records\n`);
        
        // Convert to CSV
        const csvHeaders = 'Barangay,Date,Year,Month,Record_Type,Value\n';
        
        const csvRows = result.rows.map(row => {
            const date = new Date(row.date);
            return [
                row.barangay,
                row.date.toISOString().split('T')[0],
                date.getFullYear(),
                date.getMonth() + 1,
                row.record_type,
                parseFloat(row.value).toFixed(6)
            ].join(',');
        }).join('\n');
        
        const csvContent = csvHeaders + csvRows;
        
        // Save main CSV
        const outputPath = path.join(__dirname, 'complete_forecast_data_2010_to_2026.csv');
        await fs.writeFile(outputPath, csvContent);
        
        console.log(`✅ Saved complete data to: ${outputPath}`);
        console.log(`\nFile size: ${(csvContent.length / 1024).toFixed(2)} KB`);
        console.log(`Total records: ${result.rows.length}`);
        
        // Create a pivot table format (more Excel-friendly)
        console.log(`\n📊 Creating pivot format...`);
        
        // Group by barangay and date
        const pivotData = {};
        result.rows.forEach(row => {
            const key = `${row.barangay}|${row.date.toISOString().split('T')[0]}`;
            if (!pivotData[key]) {
                pivotData[key] = {
                    barangay: row.barangay,
                    date: row.date.toISOString().split('T')[0]
                };
            }
            pivotData[key][row.record_type] = parseFloat(row.value).toFixed(6);
        });
        
        const pivotHeaders = 'Barangay,Date,Year,Month,Actual_Fires,Fitted_Value,Forecast,CI_Lower,CI_Upper,Moving_Avg_6\n';
        const pivotRows = Object.values(pivotData).map(row => {
            const date = new Date(row.date);
            return [
                row.barangay,
                row.date,
                date.getFullYear(),
                date.getMonth() + 1,
                row.actual || '',
                row.fitted || '',
                row.forecast || '',
                row.ci_lower || '',
                row.ci_upper || '',
                row.moving_avg_6 || ''
            ].join(',');
        }).join('\n');
        
        const pivotContent = pivotHeaders + pivotRows;
        const pivotPath = path.join(__dirname, 'pivot_forecast_data_2010_to_2026.csv');
        await fs.writeFile(pivotPath, pivotContent);
        
        console.log(`✅ Saved pivot format to: ${pivotPath}`);
        console.log(`\nPivot file size: ${(pivotContent.length / 1024).toFixed(2)} KB`);
        
        // Summary statistics
        console.log(`\n📈 Data Summary:`);
        console.log(`  Barangays: ${new Set(result.rows.map(r => r.barangay)).size}`);
        console.log(`  Date range: ${result.rows[0]?.date.toISOString().split('T')[0]} to ${result.rows[result.rows.length-1]?.date.toISOString().split('T')[0]}`);
        
        // Count by record type
        const byType = {};
        result.rows.forEach(row => {
            byType[row.record_type] = (byType[row.record_type] || 0) + 1;
        });
        
        console.log(`\n  Records by type:`);
        Object.keys(byType).sort().forEach(type => {
            console.log(`    ${type}: ${byType[type]}`);
        });
        
        console.log(`\n✅ Export complete!`);
        console.log(`\nYou now have:`);
        console.log(`  1. ${outputPath} - Long format (one row per record)`);
        console.log(`  2. ${pivotPath} - Pivot format (all types in columns)`);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err.stack);
    } finally {
        await client.end();
    }
}

exportCompleteData();
