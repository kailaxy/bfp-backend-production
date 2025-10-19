// Check forecast dates in Singapore database
const { Client } = require('pg');

const connectionString = "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com:5432/bfpmapping_nua2";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function checkForecastDates() {
    try {
        await client.connect();
        console.log('✅ Connected\n');
        
        // Check forecast date ranges
        const query = `
            SELECT 
                MIN(year) as min_year,
                MAX(year) as max_year,
                MIN(month) as min_month,
                MAX(month) as max_month,
                COUNT(*) as total,
                COUNT(DISTINCT barangay_name) as barangay_count
            FROM forecasts
        `;
        
        const result = await client.query(query);
        const stats = result.rows[0];
        
        console.log('📊 Forecast Statistics:\n');
        console.log(`  Total forecasts: ${stats.total}`);
        console.log(`  Barangays: ${stats.barangay_count}`);
        console.log(`  Year range: ${stats.min_year} - ${stats.max_year}`);
        console.log(`  Month range: ${stats.min_month} - ${stats.max_month}\n`);
        
        // Check current date vs forecast dates
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        console.log(`Current date: ${currentYear}-${currentMonth.toString().padStart(2, '0')}\n`);
        
        // Check how many are in the future
        const futureQuery = `
            SELECT COUNT(*) as future_count
            FROM forecasts
            WHERE (year > $1) OR (year = $1 AND month >= $2)
        `;
        
        const futureResult = await client.query(futureQuery, [currentYear, currentMonth]);
        const futureCount = futureResult.rows[0].future_count;
        
        console.log(`Forecasts for current month onwards: ${futureCount}`);
        console.log(`Forecasts in the past: ${stats.total - futureCount}\n`);
        
        if (futureCount === 0) {
            console.log('⚠️ WARNING: All forecasts are in the past!');
            console.log('   The API filters to only show future forecasts.');
            console.log('   Need to regenerate forecasts for current/future months.');
        }
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

checkForecastDates();
