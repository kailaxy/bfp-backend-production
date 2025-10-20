// Test the exact API query
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com:5432/bfpmapping_nua2",
    ssl: { rejectUnauthorized: false }
});

async function testAPIQuery() {
    try {
        await client.connect();
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        console.log(`\nTesting API query with year=${currentYear}, month=${currentMonth}\n`);
        
        const query = `
          SELECT 
            barangay_name as barangay,
            year || '-' || LPAD(month::text, 2, '0') || '-01' as forecast_month,
            predicted_cases,
            lower_bound,
            upper_bound,
            risk_level,
            COALESCE(model_used, 'ARIMA (legacy)') as model_used,
            created_at
          FROM forecasts
          WHERE (year > $1) OR (year = $1 AND month >= $2)
          ORDER BY barangay_name, year, month
        `;

        const result = await client.query(query, [currentYear, currentMonth]);
        
        console.log(`✅ Query returned ${result.rows.length} rows\n`);
        
        if (result.rows.length > 0) {
            console.log('Sample forecasts:');
            result.rows.slice(0, 3).forEach(row => {
                console.log(`  ${row.barangay} - ${row.forecast_month} - ${parseFloat(row.predicted_cases).toFixed(2)} cases`);
            });
        } else {
            console.log('⚠️ No results!');
            console.log('Checking what dates are in the table...\n');
            
            const checkQuery = `
                SELECT year, month, COUNT(*) as count
                FROM forecasts
                GROUP BY year, month
                ORDER BY year, month
                LIMIT 5
            `;
            const checkResult = await client.query(checkQuery);
            console.log('Forecast dates in table:');
            checkResult.rows.forEach(row => {
                console.log(`  ${row.year}-${row.month.toString().padStart(2, '0')}: ${row.count} forecasts`);
            });
        }
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err.stack);
    } finally {
        await client.end();
    }
}

testAPIQuery();
