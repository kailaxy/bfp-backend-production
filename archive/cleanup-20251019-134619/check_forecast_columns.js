// Check forecast table structure
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com:5432/bfpmapping_nua2",
    ssl: { rejectUnauthorized: false }
});

async function checkTable() {
    try {
        await client.connect();
        
        // Get columns
        const columnsQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'forecasts'
            ORDER BY ordinal_position
        `;
        const columns = await client.query(columnsQuery);
        
        console.log('\n📋 Forecasts table columns:\n');
        columns.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type}`);
        });
        
        // Get sample row
        const sampleQuery = 'SELECT * FROM forecasts LIMIT 1';
        const sample = await client.query(sampleQuery);
        
        console.log('\n📄 Sample forecast record:\n');
        if (sample.rows.length > 0) {
            console.log(JSON.stringify(sample.rows[0], null, 2));
        }
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

checkTable();
