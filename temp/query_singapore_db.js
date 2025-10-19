const { Client } = require('pg');

const connectionString = "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com:5432/bfpmapping_nua2";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function getTableCounts() {
    try {
        await client.connect();
        console.log('âœ… Connected to Singapore database\n');
        
        // Get all table names
        const tablesResult = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename
        `);
        
        console.log('ðŸ“Š Table Row Counts:\n');
        console.log('â•'.repeat(60));
        
        let totalRows = 0;
        const counts = [];
        
        // Get count for each table
        for (const row of tablesResult.rows) {
            const tableName = row.tablename;
            try {
                const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
                const count = parseInt(countResult.rows[0].count);
                counts.push({ table: tableName, count: count });
                totalRows += count;
            } catch (err) {
                counts.push({ table: tableName, count: 'ERROR' });
            }
        }
        
        // Sort by count descending
        counts.sort((a, b) => {
            if (typeof a.count === 'number' && typeof b.count === 'number') {
                return b.count - a.count;
            }
            return 0;
        });
        
        // Print results
        counts.forEach(item => {
            const countStr = typeof item.count === 'number' ? item.count.toLocaleString() : item.count;
            const padding = ' '.repeat(Math.max(1, 40 - item.table.length));
            console.log(`  ${item.table}${padding}${countStr}`);
        });
        
        console.log('â•'.repeat(60));
        console.log(`  TOTAL RECORDS${' '.repeat(27)}${totalRows.toLocaleString()}\n`);
        
        // Check for specific important tables
        console.log('\nðŸ“‹ Key Tables Status:\n');
        const keyTables = ['historical_fires', 'forecasts', 'forecasts_graphs'];
        for (const tableName of keyTables) {
            const found = counts.find(c => c.table === tableName);
            if (found) {
                const status = found.count > 0 ? 'âœ…' : 'âš ï¸';
                console.log(`  ${status} ${tableName}: ${typeof found.count === 'number' ? found.count.toLocaleString() : found.count}`);
            } else {
                console.log(`  âŒ ${tableName}: TABLE NOT FOUND`);
            }
        }
        
    } catch (err) {
        console.error('âŒ Error:', err.message);
    } finally {
        await client.end();
    }
}

getTableCounts();
