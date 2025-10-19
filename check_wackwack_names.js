require('dotenv').config();
const { Pool } = require('pg');

async function checkWackwackNames() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('🔍 Checking Wack-wack name variations...\n');
    
    // Check historical_fires
    const histResult = await pool.query(`
      SELECT DISTINCT barangay 
      FROM historical_fires 
      WHERE barangay ILIKE '%wack%' 
      ORDER BY barangay
    `);
    
    console.log('📊 In historical_fires table:');
    histResult.rows.forEach(row => console.log(`   "${row.barangay}"`));
    
    // Check barangays
    const boundResult = await pool.query(`
      SELECT DISTINCT name 
      FROM barangays 
      WHERE name ILIKE '%wack%'
      ORDER BY name
    `);
    
    console.log('\n📍 In barangays table:');
    boundResult.rows.forEach(row => console.log(`   "${row.name}"`));
    
    // Check forecasts
    const forecastResult = await pool.query(`
      SELECT DISTINCT barangay_name 
      FROM forecasts 
      WHERE barangay_name ILIKE '%wack%'
      ORDER BY barangay_name
    `);
    
    console.log('\n📈 In forecasts table:');
    if (forecastResult.rows.length === 0) {
      console.log('   ❌ No forecasts found for Wack-wack!');
    } else {
      forecastResult.rows.forEach(row => console.log(`   "${row.barangay_name}"`));
    }
    
    // Check forecasts_graphs
    const graphResult = await pool.query(`
      SELECT DISTINCT barangay 
      FROM forecasts_graphs 
      WHERE barangay ILIKE '%wack%'
      ORDER BY barangay
    `);
    
    console.log('\n📊 In forecasts_graphs table:');
    if (graphResult.rows.length === 0) {
      console.log('   ❌ No graph data found for Wack-wack!');
    } else {
      graphResult.rows.forEach(row => console.log(`   "${row.barangay}"`));
    }
    
    console.log('\n═'.repeat(80));
    console.log('ANALYSIS');
    console.log('═'.repeat(80));
    
    if (histResult.rows.length > 0 && boundResult.rows.length > 0) {
      const histName = histResult.rows[0].barangay;
      const boundName = boundResult.rows[0].barangay_name;
      
      if (histName !== boundName) {
        console.log(`⚠️  NAME MISMATCH DETECTED!`);
        console.log(`   Historical fires: "${histName}"`);
        console.log(`   Boundaries: "${boundName}"`);
        console.log(`\n   This mismatch prevents forecasts from being generated!\n`);
      } else {
        console.log(`✅ Names match: "${histName}"\n`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkWackwackNames();
