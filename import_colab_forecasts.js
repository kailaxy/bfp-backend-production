const db = require('./config/db');
const fs = require('fs').promises;
const path = require('path');

async function importColabResults() {
  const client = await db.pool.connect();
  
  try {
    console.log('📥 Importing Colab forecast results to database...\n');
    
    // Read the colabresult.csv file
    const csvPath = path.join(__dirname, '..', 'colabresult.csv');
    const csvContent = await fs.readFile(csvPath, 'utf8');
    
    // Parse CSV (skip header)
    const lines = csvContent.split('\n').slice(1).filter(line => line.trim());
    
    console.log(`📊 Found ${lines.length} forecast records in CSV\n`);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Clear existing forecasts
    console.log('🗑️  Clearing existing forecasts...');
    await client.query('DELETE FROM forecasts');
    console.log('✅ Existing forecasts cleared\n');
    
    let insertCount = 0;
    let skippedCount = 0;
    
    console.log('💾 Inserting Colab forecasts...');
    
    for (const line of lines) {
      // Parse CSV line: DATE,Lower_CI,Upper_CI,Forecast,Barangay,Model_Used,MAE,RMSE
      // Example: 2025-10-01 00:00:00,-0.530187404,3.563227312,0.46419318,Addition Hills,"SARIMAX(2, 0, 1)+(0, 1, 1, 12)",1.0411,1.4233
      const parts = line.split(',');
      
      if (parts.length < 8) {
        console.log(`⚠️  Skipping invalid line: ${line}`);
        skippedCount++;
        continue;
      }
      
      // Extract values
      const dateStr = parts[0].trim(); // "2025-10-01 00:00:00"
      const lowerBound = parseFloat(parts[1]);
      const upperBound = parseFloat(parts[2]);
      const predictedCases = parseFloat(parts[3]);
      const barangayName = parts[4].trim();
      
      // Model_Used might have commas inside quotes, so join remaining parts
      let modelUsed = parts.slice(5, parts.length - 2).join(',').trim();
      // Remove quotes if present
      modelUsed = modelUsed.replace(/^"|"$/g, '');
      
      // Parse date to get year and month
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      // Validate values
      if (isNaN(year) || isNaN(month) || year < 2000 || year > 2100 || month < 1 || month > 12) {
        console.log(`⚠️  Skipping invalid date: ${dateStr}`);
        skippedCount++;
        continue;
      }
      
      if (isNaN(predictedCases)) {
        console.log(`⚠️  Skipping NaN predicted_cases for ${barangayName} ${year}-${month}`);
        skippedCount++;
        continue;
      }
      
      // Determine risk level based on predicted_cases (matching frontend logic)
      let riskLevel;
      if (predictedCases >= 1) {
        riskLevel = 'High';
      } else if (predictedCases >= 0.5) {
        riskLevel = 'Medium';
      } else if (predictedCases >= 0.2) {
        riskLevel = 'Low-Moderate';
      } else if (predictedCases >= 0) {
        riskLevel = 'Very Low';
      } else {
        riskLevel = 'Unknown';
      }
      
      // Determine risk_flag based on upper_bound
      const riskFlag = upperBound >= 2;
      
      // Insert into database
      const insertQuery = `
        INSERT INTO forecasts (
          barangay_name, 
          year,
          month,
          predicted_cases, 
          lower_bound, 
          upper_bound, 
          risk_level,
          risk_flag,
          model_used,
          confidence_interval,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (barangay_name, year, month) 
        DO UPDATE SET
          predicted_cases = EXCLUDED.predicted_cases,
          lower_bound = EXCLUDED.lower_bound,
          upper_bound = EXCLUDED.upper_bound,
          risk_level = EXCLUDED.risk_level,
          risk_flag = EXCLUDED.risk_flag,
          model_used = EXCLUDED.model_used,
          confidence_interval = EXCLUDED.confidence_interval,
          created_at = EXCLUDED.created_at
      `;
      
      await client.query(insertQuery, [
        barangayName,
        year,
        month,
        predictedCases,
        lowerBound,
        upperBound,
        riskLevel,
        riskFlag,
        modelUsed,
        95 // confidence_interval as integer percentage
      ]);
      
      insertCount++;
      
      // Show progress every 50 records
      if (insertCount % 50 === 0) {
        console.log(`   Processed ${insertCount} records...`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Import Complete!');
    console.log('='.repeat(60));
    console.log(`   Total forecasts inserted: ${insertCount}`);
    console.log(`   Records skipped: ${skippedCount}`);
    
    // Show summary by barangay
    const summaryResult = await db.pool.query(`
      SELECT 
        barangay_name,
        COUNT(*) as forecast_count,
        MIN(year || '-' || LPAD(month::text, 2, '0')) as first_month,
        MAX(year || '-' || LPAD(month::text, 2, '0')) as last_month
      FROM forecasts
      GROUP BY barangay_name
      ORDER BY barangay_name
    `);
    
    console.log('\n📊 Forecast Summary by Barangay:');
    console.log('─'.repeat(70));
    console.log('Barangay                  | Count | First Month | Last Month');
    console.log('─'.repeat(70));
    summaryResult.rows.forEach(row => {
      console.log(
        `${row.barangay_name.padEnd(25)} | ${row.forecast_count.toString().padStart(5)} | ${row.first_month} | ${row.last_month}`
      );
    });
    console.log('─'.repeat(70));
    
    // Show Addition Hills sample
    const additionHillsResult = await db.pool.query(`
      SELECT year, month, predicted_cases, risk_level, model_used
      FROM forecasts
      WHERE barangay_name = 'Addition Hills'
      ORDER BY year, month
      LIMIT 12
    `);
    
    console.log('\n🔍 Addition Hills Forecasts (first 12 months):');
    console.log('─'.repeat(70));
    additionHillsResult.rows.forEach(row => {
      console.log(
        `   ${row.year}-${row.month.toString().padStart(2, '0')}: ${Number(row.predicted_cases).toFixed(3)} (${row.risk_level}) - ${row.model_used}`
      );
    });
    console.log('─'.repeat(70));
    
    console.log('\n✅ Colab forecasts successfully imported!');
    console.log('🌐 You can now view them on the frontend map\n');
    
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing forecasts:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

importColabResults();
