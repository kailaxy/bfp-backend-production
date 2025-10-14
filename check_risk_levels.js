const db = require('./config/db');

async function checkRiskLevels() {
  try {
    console.log('🔍 Checking risk levels for all barangays (October 2025)...\n');
    
    const result = await db.query(`
      SELECT barangay_name, predicted_cases, risk_level 
      FROM forecasts 
      WHERE year = 2025 AND month = 10 
      ORDER BY predicted_cases DESC
    `);
    
    console.log('📊 All barangay forecasts:\n');
    result.rows.forEach(r => {
      const cases = parseFloat(r.predicted_cases).toFixed(2);
      console.log(`  ${r.barangay_name.padEnd(25)} ${cases.padStart(6)} fires → ${r.risk_level || 'NULL'}`);
    });
    
    console.log('\n🎯 Specific cases:\n');
    const additionHills = result.rows.find(r => r.barangay_name === 'Addition Hills');
    const namayan = result.rows.find(r => r.barangay_name === 'Namayan');
    
    if (additionHills) {
      console.log(`Addition Hills: ${additionHills.predicted_cases} fires → Risk: "${additionHills.risk_level}"`);
    }
    if (namayan) {
      console.log(`Namayan: ${namayan.predicted_cases} fires → Risk: "${namayan.risk_level}"`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRiskLevels();
