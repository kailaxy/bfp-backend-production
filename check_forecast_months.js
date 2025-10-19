require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function checkForecastMonths() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Checking forecast date ranges...\n');
    
    // Check overall date range
    const rangeResult = await client.query(`
      SELECT 
        MIN(DATE(year || '-' || LPAD(month::text, 2, '0') || '-01')) as earliest,
        MAX(DATE(year || '-' || LPAD(month::text, 2, '0') || '-01')) as latest,
        COUNT(DISTINCT DATE(year || '-' || LPAD(month::text, 2, '0') || '-01')) as unique_months
      FROM forecasts
    `);
    
    console.log('Overall Range:');
    console.log(`  Earliest: ${rangeResult.rows[0].earliest}`);
    console.log(`  Latest: ${rangeResult.rows[0].latest}`);
    console.log(`  Unique months: ${rangeResult.rows[0].unique_months}\n`);
    
    // Calculate months between
    const earliest = new Date(rangeResult.rows[0].earliest);
    const latest = new Date(rangeResult.rows[0].latest);
    const monthsDiff = (latest.getFullYear() - earliest.getFullYear()) * 12 + 
                       (latest.getMonth() - earliest.getMonth()) + 1;
    console.log(`  Total span: ${monthsDiff} months\n`);
    
    // Check per barangay
    const barangayResult = await client.query(`
      SELECT 
        barangay_name,
        COUNT(*) as forecast_count,
        MIN(DATE(year || '-' || LPAD(month::text, 2, '0') || '-01')) as earliest,
        MAX(DATE(year || '-' || LPAD(month::text, 2, '0') || '-01')) as latest
      FROM forecasts
      GROUP BY barangay_name
      ORDER BY forecast_count DESC, barangay_name
    `);
    
    console.log('Per Barangay:\n');
    console.log('─'.repeat(100));
    console.log(` ${'Barangay'.padEnd(30)} | Count | Earliest    | Latest      | Months`);
    console.log('─'.repeat(100));
    
    barangayResult.rows.forEach(row => {
      const earliest = new Date(row.earliest);
      const latest = new Date(row.latest);
      const months = (latest.getFullYear() - earliest.getFullYear()) * 12 + 
                     (latest.getMonth() - earliest.getMonth()) + 1;
      
      const name = row.barangay_name.padEnd(30);
      const count = row.forecast_count.toString().padStart(5);
      const early = row.earliest;
      const late = row.latest;
      const span = months.toString().padStart(6);
      
      console.log(` ${name} | ${count} | ${early} | ${late} | ${span}`);
    });
    console.log('─'.repeat(100));
    
    // Check if there are old forecasts
    console.log('\n📅 Current Date: 2025-10-14');
    console.log('Expected: October 2025 to October 2026 (13 months)\n');
    
    const oldForecastsResult = await client.query(`
      SELECT 
        barangay_name,
        year,
        month,
        created_at
      FROM forecasts
      WHERE DATE(year || '-' || LPAD(month::text, 2, '0') || '-01') < '2025-10-01'
      ORDER BY year, month, barangay_name
      LIMIT 10
    `);
    
    if (oldForecastsResult.rows.length > 0) {
      console.log('⚠️  Found old forecasts (before Oct 2025):');
      oldForecastsResult.rows.forEach(row => {
        console.log(`  ${row.barangay_name}: ${row.year}-${String(row.month).padStart(2, '0')} (created: ${row.created_at})`);
      });
    } else {
      console.log('✅ No old forecasts found');
    }
    
    // Check future forecasts
    const futureForecastsResult = await client.query(`
      SELECT 
        barangay_name,
        year,
        month,
        created_at
      FROM forecasts
      WHERE DATE(year || '-' || LPAD(month::text, 2, '0') || '-01') > '2026-10-01'
      ORDER BY year, month, barangay_name
      LIMIT 10
    `);
    
    if (futureForecastsResult.rows.length > 0) {
      console.log('\n⚠️  Found forecasts beyond Oct 2026:');
      futureForecastsResult.rows.forEach(row => {
        console.log(`  ${row.barangay_name}: ${row.year}-${String(row.month).padStart(2, '0')} (created: ${row.created_at})`);
      });
    } else {
      console.log('\n✅ No forecasts beyond Oct 2026');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkForecastMonths();
