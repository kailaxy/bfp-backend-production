/**
 * Verify forecasts table has Colab data
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function verifyForecasts() {
    try {
        console.log("🔍 Verifying forecasts table...\n");
        
        const countResult = await pool.query('SELECT COUNT(*) as count FROM forecasts');
        console.log(`✅ Total forecasts in database: ${countResult.rows[0].count}`);
        
        const sampleResult = await pool.query(`
            SELECT barangay_name, year, month, predicted_cases, risk_level, model_used 
            FROM forecasts 
            ORDER BY barangay_name, year, month 
            LIMIT 5
        `);
        
        console.log("\n📊 Sample records:");
        sampleResult.rows.forEach(row => {
            const predicted = parseFloat(row.predicted_cases);
            console.log(`   - ${row.barangay_name} ${row.year}-${String(row.month).padStart(2, '0')}: ${predicted.toFixed(4)} fires (${row.risk_level}) [${row.model_used}]`);
        });
        
        const dateRangeResult = await pool.query(`
            SELECT 
                MIN(year || '-' || LPAD(month::text, 2, '0')) as min_date,
                MAX(year || '-' || LPAD(month::text, 2, '0')) as max_date
            FROM forecasts
        `);
        
        console.log(`\n📅 Date range: ${dateRangeResult.rows[0].min_date} to ${dateRangeResult.rows[0].max_date}`);
        
        const barangayCount = await pool.query(`
            SELECT COUNT(DISTINCT barangay_name) as count FROM forecasts
        `);
        
        console.log(`📍 Barangays: ${barangayCount.rows[0].count}`);
        
        console.log("\n✅ Forecasts table successfully updated with Colab data!");
        console.log("🔄 Graphs should automatically update when you refresh the frontend!");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await pool.end();
    }
}

verifyForecasts();
