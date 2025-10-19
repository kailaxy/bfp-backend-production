const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function addWackWackForecasts() {
  try {
    console.log('🔧 Adding Wack-Wack Greenhills forecasts...\n');
    
    const csvPath = path.join(__dirname, '..', 'colabresult.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Find Wack-wack records
    const wackWackLines = lines.filter(line => line.includes('Wack-wack'));
    console.log(`Found ${wackWackLines.length} Wack-wack records in CSV\n`);
    
    let inserted = 0;
    
    for (const line of wackWackLines) {
      // Parse CSV (handle quoted fields)
      const parts = line.split(',');
      
      const dateStr = parts[0];
      const lowerBound = parseFloat(parts[1]);
      const upperBound = parseFloat(parts[2]);
      const predictedCases = parseFloat(parts[3]);
      
      // Model_Used might have commas inside quotes
      let modelUsed = parts.slice(5, parts.length - 2).join(',').trim();
      modelUsed = modelUsed.replace(/^"|"$/g, '');
      
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      // Calculate risk level based on predicted_cases
      let riskLevel;
      if (predictedCases >= 1) riskLevel = 'High';
      else if (predictedCases >= 0.5) riskLevel = 'Medium';
      else if (predictedCases >= 0.2) riskLevel = 'Low-Moderate';
      else riskLevel = 'Very Low';
      
      // Calculate risk flag (upper_bound >= 2)
      const riskFlag = upperBound >= 2;
      
      // Insert with correct name: "Wack-Wack Greenhills"
      await db.query(`
        INSERT INTO forecasts (
          barangay_name, year, month, predicted_cases, lower_bound, upper_bound,
          risk_level, risk_flag, model_used, confidence_interval
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (barangay_name, year, month) 
        DO UPDATE SET
          predicted_cases = EXCLUDED.predicted_cases,
          lower_bound = EXCLUDED.lower_bound,
          upper_bound = EXCLUDED.upper_bound,
          risk_level = EXCLUDED.risk_level,
          risk_flag = EXCLUDED.risk_flag,
          model_used = EXCLUDED.model_used,
          confidence_interval = EXCLUDED.confidence_interval,
          updated_at = CURRENT_TIMESTAMP
      `, [
        'Wack-Wack Greenhills',  // Use correct capitalization
        year,
        month,
        predictedCases,
        lowerBound,
        upperBound,
        riskLevel,
        riskFlag,
        modelUsed,
        95
      ]);
      
      inserted++;
      console.log(`✅ ${year}-${String(month).padStart(2, '0')}: ${predictedCases.toFixed(3)} (${riskLevel})`);
    }
    
    console.log(`\n✅ Successfully added ${inserted} Wack-Wack Greenhills forecasts!`);
    
    // Verify all 27 barangays
    console.log('\n📊 Final barangay count:');
    const count = await db.query(`
      SELECT COUNT(DISTINCT barangay_name) as count
      FROM forecasts
    `);
    console.log(`   Total barangays with forecasts: ${count.rows[0].count}`);
    
    if (count.rows[0].count == 27) {
      console.log('   ✅ All 27 barangays now have forecasts!');
    } else {
      console.log(`   ⚠️  Expected 27, got ${count.rows[0].count}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addWackWackForecasts();
