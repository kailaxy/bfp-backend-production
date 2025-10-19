// Check what's in the forecasts_graphs table (for graph visualization)
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com:5432/bfpmapping_nua2",
    ssl: { rejectUnauthorized: false }
});

async function analyzeGraphData() {
    try {
        await client.connect();
        console.log('✅ Connected\n');
        
        // Get summary by record type
        const summaryQuery = `
            SELECT 
                record_type,
                MIN(date) as earliest_date,
                MAX(date) as latest_date,
                COUNT(*) as record_count
            FROM forecasts_graphs
            GROUP BY record_type
            ORDER BY record_type
        `;
        
        const summary = await client.query(summaryQuery);
        
        console.log('📊 Graph Data Summary:\n');
        console.log('Record Type          | Count  | Date Range');
        console.log('---------------------|--------|----------------------------------');
        
        summary.rows.forEach(row => {
            const type = row.record_type.padEnd(20);
            const count = row.record_count.toString().padStart(6);
            const range = `${row.earliest_date.toISOString().split('T')[0]} to ${row.latest_date.toISOString().split('T')[0]}`;
            console.log(`${type} | ${count} | ${range}`);
        });
        
        console.log('\n');
        
        // Get sample for one barangay to show date coverage
        const sampleQuery = `
            SELECT barangay, record_type, date, value
            FROM forecasts_graphs
            WHERE barangay = 'Addition Hills'
            ORDER BY record_type, date
        `;
        
        const sample = await client.query(sampleQuery);
        
        console.log('📈 Sample data for Addition Hills:\n');
        
        // Group by record type
        const byType = {};
        sample.rows.forEach(row => {
            if (!byType[row.record_type]) {
                byType[row.record_type] = [];
            }
            byType[row.record_type].push(row);
        });
        
        Object.keys(byType).sort().forEach(type => {
            const records = byType[type];
            console.log(`${type}:`);
            console.log(`  Records: ${records.length}`);
            console.log(`  First: ${records[0].date.toISOString().split('T')[0]} (value: ${records[0].value})`);
            console.log(`  Last: ${records[records.length-1].date.toISOString().split('T')[0]} (value: ${records[records.length-1].value})`);
            console.log('');
        });
        
        console.log('\n✅ This data spans historical + forecast periods for graph visualization!');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

analyzeGraphData();
