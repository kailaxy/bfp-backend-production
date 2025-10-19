// Check the actual table name in Singapore database
const { Client } = require('pg');

const connectionString = "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com:5432/bfpmapping_nua2";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function checkTableNames() {
    try {
        await client.connect();
        console.log('✅ Connected to Singapore database\n');
        
        // Get all table names
        const tablesResult = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND (tablename LIKE '%fire%' OR tablename LIKE '%incident%')
            ORDER BY tablename
        `);
        
        console.log('🔍 Fire/Incident Related Tables:\n');
        console.log('═'.repeat(60));
        
        for (const row of tablesResult.rows) {
            const tableName = row.tablename;
            try {
                const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
                const count = parseInt(countResult.rows[0].count);
                console.log(`  ${tableName}: ${count.toLocaleString()} records`);
                
                // Get sample column names
                const columnsResult = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                    LIMIT 10
                `, [tableName]);
                
                const columns = columnsResult.rows.map(r => r.column_name).join(', ');
                console.log(`    Columns: ${columns}\n`);
                
            } catch (err) {
                console.log(`  ${tableName}: ERROR - ${err.message}\n`);
            }
        }
        
        console.log('═'.repeat(60));
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

checkTableNames();
