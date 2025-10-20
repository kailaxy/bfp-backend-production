require('dotenv').config();
const { Pool } = require('pg');

async function testMonthlyReportWithDamage() {
  console.log('📊 Testing monthly report with estimated_damage...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 1
  });
  
  try {
    // Test for a month that has data (e.g., March 2010)
    const testMonth = '2010-03-01';
    const startDate = new Date(testMonth);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    console.log(`Testing report for: ${startDate.toISOString().substring(0, 7)}\n`);
    
    // Overall statistics
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_incidents,
        COUNT(estimated_damage) as incidents_with_damage,
        SUM(estimated_damage) as total_damage,
        AVG(estimated_damage) as avg_damage,
        MIN(estimated_damage) as min_damage,
        MAX(estimated_damage) as max_damage
      FROM historical_fires
      WHERE resolved_at >= $1 AND resolved_at < $2
    `, [startDate.toISOString(), endDate.toISOString()]);
    
    console.log('📈 Overall Statistics:');
    console.log(`   Total incidents: ${overallStats.rows[0].total_incidents}`);
    console.log(`   Incidents with damage: ${overallStats.rows[0].incidents_with_damage}`);
    console.log(`   Total damage: ${parseFloat(overallStats.rows[0].total_damage || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`);
    console.log(`   Average damage: ${parseFloat(overallStats.rows[0].avg_damage || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`);
    console.log(`   Min damage: ${parseFloat(overallStats.rows[0].min_damage || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`);
    console.log(`   Max damage: ${parseFloat(overallStats.rows[0].max_damage || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`);
    
    // Barangay breakdown
    console.log('\n📍 Barangay Breakdown (with damage):');
    const barangayStats = await pool.query(`
      SELECT 
        barangay,
        COUNT(*) as incident_count,
        COUNT(estimated_damage) as damage_count,
        SUM(estimated_damage) as total_damage,
        AVG(estimated_damage) as avg_damage
      FROM historical_fires
      WHERE resolved_at >= $1 AND resolved_at < $2
      GROUP BY barangay
      ORDER BY total_damage DESC NULLS LAST
    `, [startDate.toISOString(), endDate.toISOString()]);
    
    barangayStats.rows.forEach((row, idx) => {
      if (row.total_damage) {
        console.log(`   ${idx + 1}. ${row.barangay}`);
        console.log(`      Incidents: ${row.incident_count}, With damage: ${row.damage_count}`);
        console.log(`      Total: ${parseFloat(row.total_damage).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}, Avg: ${parseFloat(row.avg_damage).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`);
      }
    });
    
    // Damage ranges
    console.log('\n💰 Damage Range Analysis:');
    const damageRanges = await pool.query(`
      SELECT 
        damage_range,
        COUNT(*) as count,
        SUM(damage_amount) as total
      FROM (
        SELECT 
          CASE 
            WHEN estimated_damage IS NULL THEN 'No data'
            WHEN estimated_damage = 0 THEN '₱0'
            WHEN estimated_damage < 100000 THEN '₱1 - ₱99,999'
            WHEN estimated_damage < 500000 THEN '₱100,000 - ₱499,999'
            WHEN estimated_damage < 1000000 THEN '₱500,000 - ₱999,999'
            ELSE '₱1,000,000+'
          END as damage_range,
          CASE 
            WHEN estimated_damage IS NULL THEN 6
            WHEN estimated_damage = 0 THEN 5
            WHEN estimated_damage < 100000 THEN 1
            WHEN estimated_damage < 500000 THEN 2
            WHEN estimated_damage < 1000000 THEN 3
            ELSE 4
          END as sort_order,
          estimated_damage as damage_amount
        FROM historical_fires
        WHERE resolved_at >= $1 AND resolved_at < $2
      ) ranges
      GROUP BY damage_range, sort_order
      ORDER BY sort_order
    `, [startDate.toISOString(), endDate.toISOString()]);
    
    damageRanges.rows.forEach(row => {
      console.log(`   ${row.damage_range}: ${row.count} incidents (Total: ${parseFloat(row.total || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })})`);
    });
    
    console.log('\n✅ Monthly report with damage data is working correctly!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

testMonthlyReportWithDamage().catch(console.error);
