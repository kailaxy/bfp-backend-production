const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testWithColabCSV() {
  try {
    console.log('🧪 Testing production ARIMA with Colab CSV data...\n');
    
    // 1. Read the Colab CSV (datatoforecasts.csv)
    console.log('📊 Step 1: Reading Colab CSV data...');
    const csvPath = path.join(__dirname, '..', 'datatoforecasts.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ datatoforecasts.csv not found in bfp-project directory');
      console.log('   Please make sure the file exists at:', csvPath);
      process.exit(1);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`   ✅ Read ${lines.length} lines from Colab CSV\n`);
    
    // Parse CSV: format is "barangay_name,YYYY-MM,incident_count"
    const historicalData = [];
    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length === 3) {
        historicalData.push({
          barangay: parts[0].trim(),
          date: parts[1].trim(),
          incident_count: parseInt(parts[2].trim())
        });
      }
    });
    
    console.log(`   Parsed ${historicalData.length} records`);
    
    // Show Addition Hills sample
    const additionHillsData = historicalData.filter(r => r.barangay === 'Addition Hills');
    console.log(`\n   Addition Hills records: ${additionHillsData.length}`);
    console.log('   Last 5 records:');
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
    
    const inputFile = path.join(__dirname, 'temp_colab_test_input.json');
    const outputFile = path.join(__dirname, 'temp_colab_test_output.json');
    
    fs.writeFileSync(inputFile, JSON.stringify(inputData, null, 2));
    console.log(`   ✅ Created input file with ${historicalData.length} records\n`);
    
    // 3. Run Python script
    console.log('🐍 Step 3: Running ARIMA forecast script with Colab data...');
    const pythonScript = path.join(__dirname, 'forecasting', 'arima_forecast_12months.py');
    const pythonCommand = 'py';
    
    console.log(`   Using: ${pythonCommand}`);
    console.log(`   Script: ${pythonScript}\n`);
    
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
      console.log('\n   Python stderr:');
      console.log(stderrData);
    }
    
    // 4. Parse and analyze results
    console.log('\n📊 Step 4: Analyzing forecast results...\n');
    const results = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    
    // Find Addition Hills forecasts
    const additionHillsForecasts = results.all_forecasts
      .filter(f => f.barangay_name === 'Addition Hills')
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      })
      .slice(0, 12);
    
    console.log('═'.repeat(100));
    console.log('PRODUCTION ARIMA WITH COLAB CSV DATA');
    console.log('═'.repeat(100));
    console.log('Month'.padEnd(15) + 'Predicted'.padEnd(15) + 'Model Used');
    console.log('─'.repeat(100));
    
    const productionValues = [];
    additionHillsForecasts.forEach(f => {
      const monthStr = `${f.year}-${String(f.month).padStart(2, '0')}`;
      console.log(
        monthStr.padEnd(15) +
        Number(f.predicted_cases).toFixed(6).padEnd(15) +
        f.model_used
      );
      productionValues.push(Number(f.predicted_cases));
    });
    
    // Calculate statistics
    const prodMean = productionValues.reduce((sum, v) => sum + v, 0) / productionValues.length;
    const prodVariance = productionValues.reduce((sum, v) => sum + Math.pow(v - prodMean, 2), 0) / productionValues.length;
    const prodStdDev = Math.sqrt(prodVariance);
    const prodRange = Math.max(...productionValues) - Math.min(...productionValues);
    
    console.log('─'.repeat(100));
    console.log(`Mean: ${prodMean.toFixed(6)}, Std Dev: ${prodStdDev.toFixed(6)}, Range: ${prodRange.toFixed(6)}`);
    console.log('═'.repeat(100));
    
    // 5. Compare with Colab results
    console.log('\n📊 Step 5: Comparing with Colab results...\n');
    
    // Read colabresult.csv
    const colabResultPath = path.join(__dirname, '..', 'colabresult.csv');
    if (fs.existsSync(colabResultPath)) {
      const colabResult = fs.readFileSync(colabResultPath, 'utf-8');
      const colabLines = colabResult.split('\n').filter(line => line.includes('Addition Hills'));
      
      console.log('═'.repeat(100));
      console.log('COLAB RESULTS (from colabresult.csv)');
      console.log('═'.repeat(100));
      console.log('Month'.padEnd(15) + 'Predicted'.padEnd(15) + 'Model Used');
      console.log('─'.repeat(100));
      
      const colabValues = [];
      colabLines.slice(0, 12).forEach(line => {
        const parts = line.split(',');
        const date = new Date(parts[0]);
        const predicted = parseFloat(parts[3]);
        const model = parts[5].replace(/"/g, '');
        
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        console.log(
          monthStr.padEnd(15) +
          predicted.toFixed(6).padEnd(15) +
          model
        );
        colabValues.push(predicted);
      });
      
      const colabMean = colabValues.reduce((sum, v) => sum + v, 0) / colabValues.length;
      const colabVariance = colabValues.reduce((sum, v) => sum + Math.pow(v - colabMean, 2), 0) / colabValues.length;
      const colabStdDev = Math.sqrt(colabVariance);
      const colabRange = Math.max(...colabValues) - Math.min(...colabValues);
      
      console.log('─'.repeat(100));
      console.log(`Mean: ${colabMean.toFixed(6)}, Std Dev: ${colabStdDev.toFixed(6)}, Range: ${colabRange.toFixed(6)}`);
      console.log('═'.repeat(100));
      
      // Calculate match percentage
      console.log('\n📊 COMPARISON ANALYSIS:\n');
      console.log('─'.repeat(100));
      console.log('Month'.padEnd(15) + 'Production'.padEnd(15) + 'Colab'.padEnd(15) + 'Difference'.padEnd(15) + 'Match %');
      console.log('─'.repeat(100));
      
      let totalDiff = 0;
      let matchCount = 0;
      for (let i = 0; i < Math.min(productionValues.length, colabValues.length); i++) {
        const diff = Math.abs(productionValues[i] - colabValues[i]);
        const matchPct = (1 - diff / Math.max(productionValues[i], colabValues[i])) * 100;
        totalDiff += diff;
        if (matchPct > 95) matchCount++;
        
        const month = additionHillsForecasts[i];
        const monthStr = `${month.year}-${String(month.month).padStart(2, '0')}`;
        console.log(
          monthStr.padEnd(15) +
          productionValues[i].toFixed(3).padEnd(15) +
          colabValues[i].toFixed(3).padEnd(15) +
          diff.toFixed(3).padEnd(15) +
          `${matchPct.toFixed(1)}%`
        );
      }
      
      console.log('─'.repeat(100));
      const avgDiff = totalDiff / Math.min(productionValues.length, colabValues.length);
      const overallMatch = (matchCount / Math.min(productionValues.length, colabValues.length)) * 100;
      console.log(`Average Difference: ${avgDiff.toFixed(3)}`);
      console.log(`Exact Matches (>95%): ${matchCount}/${Math.min(productionValues.length, colabValues.length)} (${overallMatch.toFixed(1)}%)`);
      console.log('─'.repeat(100));
      
      console.log('\n💡 DIAGNOSIS:\n');
      if (avgDiff < 0.01) {
        console.log('   ✅ EXCELLENT: Production and Colab results are nearly identical!');
        console.log('   → The issue was indeed the different database data.');
      } else if (avgDiff < 0.1) {
        console.log('   ✅ GOOD: Production and Colab results are very similar.');
        console.log('   → Small differences likely due to floating-point precision or convergence.');
      } else {
        console.log('   ❌ PROBLEM: Production and Colab results differ significantly.');
        console.log('   → This suggests the Python script itself may have differences from Colab implementation.');
      }
      
      console.log('\n   Production Range:', prodRange.toFixed(3));
      console.log('   Colab Range:', colabRange.toFixed(3));
      
      if (Math.abs(prodRange - colabRange) < 0.1) {
        console.log('   ✅ Both capture similar seasonality patterns!\n');
      } else {
        console.log('   ⚠️  Different seasonality capture between production and Colab.\n');
      }
    }
    
    // Cleanup
    fs.unlinkSync(inputFile);
    fs.unlinkSync(outputFile);
    
    console.log('✅ Test complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testWithColabCSV();
