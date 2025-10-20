const db = require('./config/db');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testProductionARIMA() {
  try {
    console.log('🧪 Testing production ARIMA with database data...\n');
    
    // 1. Fetch historical data from database (same as production does)
    console.log('📊 Step 1: Fetching historical data from database...');
    const historicalResult = await db.query(`
      SELECT 
        barangay AS barangay,
        TO_CHAR(DATE_TRUNC('month', resolved_at), 'YYYY-MM') AS date,
        COUNT(*) AS incident_count
      FROM historical_fires
      WHERE resolved_at IS NOT NULL
      GROUP BY barangay, DATE_TRUNC('month', resolved_at)
      ORDER BY barangay, DATE_TRUNC('month', resolved_at)
    `);
    
    const historicalData = historicalResult.rows.map(row => ({
      barangay: row.barangay,
      date: row.date,
      incident_count: parseInt(row.incident_count)
    }));
    
    console.log(`   ✅ Fetched ${historicalData.length} historical records\n`);
    
    // Show Addition Hills sample
    const additionHillsData = historicalData.filter(r => r.barangay === 'Addition Hills');
    console.log('   Addition Hills last 5 records:');
    additionHillsData.slice(-5).forEach(r => {
      console.log(`      ${r.date}: ${r.incident_count}`);
    });
    
    // 2. Prepare input for Python script
    console.log('\n📝 Step 2: Preparing input for Python script...');
    const now = new Date();
    const inputData = {
      historical_data: historicalData,
      start_year: now.getFullYear(),
      start_month: now.getMonth() + 1
    };
    
    const inputFile = path.join(__dirname, 'temp_test_input.json');
    const outputFile = path.join(__dirname, 'temp_test_output.json');
    
    fs.writeFileSync(inputFile, JSON.stringify(inputData, null, 2));
    console.log(`   ✅ Created input file: ${inputFile}\n`);
    
    // 3. Run Python script
    console.log('🐍 Step 3: Running ARIMA forecast script...');
    const pythonScript = path.join(__dirname, 'forecasting', 'arima_forecast_12months.py');
    
    // Detect Python command
    const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
    const pythonCommand = isRailway ? '/opt/venv/bin/python3' : 'py';
    
    console.log(`   Using: ${pythonCommand}`);
    console.log(`   Script: ${pythonScript}`);
    console.log(`   Arguments: ${inputFile} ${outputFile}\n`);
    
    const pythonProcess = spawn(pythonCommand, [pythonScript, inputFile, outputFile]);
    
    let stdoutData = '';
    let stderrData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });
    
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python exited with code ${code}`));
        }
      });
    });
    
    if (stdoutData) {
      console.log('   Python output:');
      console.log(stdoutData);
    }
    
    if (stderrData) {
      console.log('   Python stderr:');
      console.log(stderrData);
    }
    
    // 4. Parse and analyze results
    console.log('\n📊 Step 4: Analyzing forecast results...');
    const results = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    
    // Find Addition Hills forecasts
    const additionHillsForecasts = results.all_forecasts
      .filter(f => f.barangay_name === 'Addition Hills')
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      })
      .slice(0, 12);
    
    console.log('Addition Hills production forecasts:');
    console.log('─'.repeat(100));
    console.log('Month'.padEnd(15) + 'Predicted'.padEnd(15) + 'Model Used');
    console.log('─'.repeat(100));
    
    const values = [];
    additionHillsForecasts.forEach(f => {
      const monthStr = `${f.year}-${String(f.month).padStart(2, '0')}`;
      console.log(
        monthStr.padEnd(15) +
        Number(f.predicted_cases).toFixed(6).padEnd(15) +
        f.model_used
      );
      values.push(Number(f.predicted_cases));
    });
    
    // Calculate statistics
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const range = Math.max(...values) - Math.min(...values);
    
    console.log('─'.repeat(100));
    console.log(`\n📊 Statistics:`);
    console.log(`   Mean: ${mean.toFixed(6)}`);
    console.log(`   Std Dev: ${stdDev.toFixed(6)}`);
    console.log(`   Min: ${Math.min(...values).toFixed(6)}`);
    console.log(`   Max: ${Math.max(...values).toFixed(6)}`);
    console.log(`   Range: ${range.toFixed(6)}`);
    
    console.log('\n💡 Diagnosis:');
    if (range < 0.1) {
      console.log('   ❌ PROBLEM: Very low range - predictions are nearly identical!');
      console.log('   This indicates:');
      console.log('      - Seasonal component may not be working properly');
      console.log('      - Model may be reverting to mean-based fallback');
      console.log('      - Historical data may lack clear seasonal patterns');
    } else if (range < 0.3) {
      console.log('   ⚠️  WARNING: Moderate range - some variation but not strong seasonality');
    } else {
      console.log('   ✅ GOOD: Healthy range - seasonality is being captured!');
    }
    
    // Cleanup
    fs.unlinkSync(inputFile);
    fs.unlinkSync(outputFile);
    
    console.log('\n✅ Test complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testProductionARIMA();
