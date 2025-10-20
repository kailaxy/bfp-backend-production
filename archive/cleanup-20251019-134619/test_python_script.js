/**
 * Test Python Script Execution
 * Simulates what Railway does to help debug Python errors
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function testPythonScript() {
  console.log('Testing Python ARIMA Script...\n');
  
  // Create test input data
  const testData = {
    historical_data: [
      {barangay: "Addition Hills", date: "2023-01", incident_count: 2},
      {barangay: "Addition Hills", date: "2023-02", incident_count: 1},
      {barangay: "Addition Hills", date: "2023-03", incident_count: 3},
      {barangay: "Addition Hills", date: "2023-04", incident_count: 2},
      {barangay: "Addition Hills", date: "2023-05", incident_count: 1},
      {barangay: "Addition Hills", date: "2023-06", incident_count: 2},
      {barangay: "Addition Hills", date: "2023-07", incident_count: 3},
      {barangay: "Addition Hills", date: "2023-08", incident_count: 1},
      {barangay: "Addition Hills", date: "2023-09", incident_count: 2},
      {barangay: "Addition Hills", date: "2023-10", incident_count: 4},
      {barangay: "Addition Hills", date: "2023-11", incident_count: 2},
      {barangay: "Addition Hills", date: "2023-12", incident_count: 3},
      {barangay: "Addition Hills", date: "2024-01", incident_count: 2},
      {barangay: "Addition Hills", date: "2024-02", incident_count: 1},
      {barangay: "Addition Hills", date: "2024-03", incident_count: 3},
      {barangay: "Addition Hills", date: "2024-04", incident_count: 2},
      {barangay: "Addition Hills", date: "2024-05", incident_count: 1},
      {barangay: "Addition Hills", date: "2024-06", incident_count: 2},
      {barangay: "Addition Hills", date: "2024-07", incident_count: 3},
      {barangay: "Addition Hills", date: "2024-08", incident_count: 1},
      {barangay: "Addition Hills", date: "2024-09", incident_count: 2},
      {barangay: "Addition Hills", date: "2024-10", incident_count: 2}
    ],
    start_year: 2025,
    start_month: 10
  };
  
  const inputFile = path.join(__dirname, 'temp', 'test_input.json');
  const outputFile = path.join(__dirname, 'temp', 'test_output.json');
  
  // Ensure temp directory exists
  await fs.mkdir(path.join(__dirname, 'temp'), { recursive: true });
  
  // Write test input
  await fs.writeFile(inputFile, JSON.stringify(testData, null, 2));
  console.log('✅ Created test input file');
  
  // Test Python script path
  const pythonScript = path.join(__dirname, 'forecasting', 'arima_forecast_12months.py');
  console.log(`📄 Python script: ${pythonScript}`);
  
  // Check if file exists
  try {
    await fs.access(pythonScript);
    console.log('✅ Python script file exists\n');
  } catch (err) {
    console.error('❌ Python script file NOT FOUND!');
    process.exit(1);
  }
  
  // Check Python dependencies
  console.log('Checking Python installation...');
  const checkPython = spawn('py', ['--version']);
  
  checkPython.stdout.on('data', (data) => {
    console.log('✅ Python version:', data.toString().trim());
  });
  
  checkPython.on('close', async (code) => {
    if (code !== 0) {
      console.error('❌ Python not found. Try: python --version');
      return;
    }
    
    console.log('\nRunning Python ARIMA script...\n');
    console.log('='.repeat(60));
    
    // Run Python script
    const pythonProcess = spawn('py', [pythonScript, inputFile, outputFile]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('[Python Output]:', output.trim());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      stderr += error;
      console.error('[Python Error]:', error.trim());
    });
    
    pythonProcess.on('close', async (code) => {
      console.log('='.repeat(60));
      console.log(`\nPython process exited with code: ${code}\n`);
      
      if (code !== 0) {
        console.error('❌ PYTHON SCRIPT FAILED!');
        console.error('\nFull stderr output:');
        console.error(stderr);
        
        if (stderr.includes('ModuleNotFoundError')) {
          console.error('\n💡 Solution: Install missing Python packages');
          console.error('   Run: pip install -r forecasting/requirements.txt');
        }
        
        if (stderr.includes('barangay_models')) {
          console.error('\n💡 Solution: barangay_models.py might be missing');
          console.error('   Check: forecasting/barangay_models.py exists');
        }
        
        process.exit(1);
      }
      
      console.log('✅ PYTHON SCRIPT SUCCESS!');
      
      // Check output file
      try {
        const outputData = await fs.readFile(outputFile, 'utf8');
        const results = JSON.parse(outputData);
        
        console.log('\n📊 Results:');
        console.log(`   Total forecasts: ${results.forecasts ? results.forecasts.length : 0}`);
        
        if (results.forecasts && results.forecasts.length > 0) {
          const sample = results.forecasts[0];
          console.log('\n   Sample forecast:');
          console.log(`   - Barangay: ${sample.barangay}`);
          console.log(`   - Date: ${sample.date}`);
          console.log(`   - Predicted: ${sample.predicted_cases}`);
          console.log(`   - Risk Level: ${sample.risk_level}`);
          console.log(`   - Model: ${sample.model_used}`);
        }
        
        console.log('\n✅ ALL TESTS PASSED!');
        
      } catch (err) {
        console.error('\n❌ Failed to read output file:', err.message);
      }
    });
  });
}

testPythonScript().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
