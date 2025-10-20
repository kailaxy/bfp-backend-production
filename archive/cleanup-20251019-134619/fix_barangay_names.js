/**
 * Fix barangay names in forecasts table to match GeoJSON
 * Specifically: Add ñ back to Zaniga barangays
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixBarangayNames() {
    try {
        console.log("🔧 Fixing barangay names to match GeoJSON...\n");
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Fix New Zaniga -> New Zañiga
            const result1 = await client.query(`
                UPDATE forecasts
                SET barangay_name = 'New Zañiga'
                WHERE barangay_name = 'New Zaniga'
            `);
            console.log(`✅ Updated ${result1.rowCount} records: New Zaniga -> New Zañiga`);
            
            // Fix Old Zaniga -> Old Zañiga
            const result2 = await client.query(`
                UPDATE forecasts
                SET barangay_name = 'Old Zañiga'
                WHERE barangay_name = 'Old Zaniga'
            `);
            console.log(`✅ Updated ${result2.rowCount} records: Old Zaniga -> Old Zañiga`);
            
            // Also fix Hagdang Bato variations if needed
            const result3 = await client.query(`
                UPDATE forecasts
                SET barangay_name = 'Hagdang Bato Itaas'
                WHERE barangay_name = 'Hagdan Bato Itaas'
            `);
            console.log(`✅ Updated ${result3.rowCount} records: Hagdan Bato Itaas -> Hagdang Bato Itaas`);
            
            const result4 = await client.query(`
                UPDATE forecasts
                SET barangay_name = 'Hagdang Bato Libis'
                WHERE barangay_name = 'Hagdan Bato Libis'
            `);
            console.log(`✅ Updated ${result4.rowCount} records: Hagdan Bato Libis -> Hagdang Bato Libis`);
            
            await client.query('COMMIT');
            
            console.log("\n✅ Barangay names fixed!");
            
            // Verify
            const verify = await client.query(`
                SELECT DISTINCT barangay_name
                FROM forecasts
                WHERE barangay_name LIKE '%Zañiga%'
                ORDER BY barangay_name
            `);
            
            console.log("\n📍 Zañiga barangays in database:");
            verify.rows.forEach(row => {
                console.log(`   - ${row.barangay_name}`);
            });
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await pool.end();
    }
}

fixBarangayNames();
