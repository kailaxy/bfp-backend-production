/**
 * Check what risk levels are actually in the database
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkRiskLevels() {
    try {
        console.log("🔍 Checking risk levels in forecasts table...\n");
        
        const result = await pool.query(`
            SELECT DISTINCT risk_level, COUNT(*) as count
            FROM forecasts
            GROUP BY risk_level
            ORDER BY count DESC
        `);
        
        console.log("Risk levels found:");
        result.rows.forEach(row => {
            console.log(`  - "${row.risk_level}": ${row.count} records`);
        });
        
        console.log("\n🔍 Checking barangay names...\n");
        
        const barangays = await pool.query(`
            SELECT DISTINCT barangay_name
            FROM forecasts
            ORDER BY barangay_name
        `);
        
        console.log("Barangays in forecasts:");
        barangays.rows.forEach(row => {
            console.log(`  - ${row.barangay_name}`);
        });
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await pool.end();
    }
}

checkRiskLevels();
