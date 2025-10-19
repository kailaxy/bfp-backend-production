require('dotenv').config();
const { Pool } = require('pg');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function regenerateForecasts() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Regenerating forecasts for Wack-Wack Greenhills...\n');
    
    // Step 1: Fetch historical data
    console.log('📊 Fetching historical data from database...');
    const histResult = await client.query(`
      SELECT barangay, 
             TO_CHAR(resolved_at, 'YYYY-MM') as date,
             COUNT(*) as incident_count
      FROM historical_fires
      WHERE barangay = 'Wack-Wack Greenhills'
      GROUP BY barangay, TO_CHAR(resolved_at, 'YYYY-MM')
      ORDER BY date
    `);
    
    console.log(`✅ Found ${histResult.rows.length} month-records for Wack-Wack Greenhills`);
    
    if (histResult.rows.length === 0) {
      console.log('❌ No historical data found for Wack-Wack Greenhills!');
      return;
    }
    
    // Step 2: Prepare input for Python script
    const inputData = {
      historical_data: histResult.rows.map(row => ({
        barangay: row.barangay,
        date: row.date,
        incident_count: parseInt(row.incident_count)
      })),
      start_year: 2025,
      start_month: 10
    };
    
    const inputPath = path.join(__dirname, 'temp_input.json');
    const outputPath = path.join(__dirname, 'temp_output.json');
    
    await fs.writeFile(inputPath, JSON.stringify(inputData, null, 2));
    console.log('✅ Prepared input data\n');
    
    // Step 3: Run Python script
    console.log('🐍 Running ARIMA forecast script...');
    const pythonScript = path.join(__dirname, 'forecasting', 'arima_forecast_12months.py');
    
    await new Promise((resolve, reject) => {
      const python = spawn('python', [pythonScript, inputPath, outputPath]);
      
      python.stdout.on('data', (data) => {
        console.log(data.toString().trim());
      });
      
      python.stderr.on('data', (data) => {
        console.error(data.toString().trim());
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}`));
        } else {
          resolve();
        }
      });
    });
    
    console.log('✅ Forecasts generated\n');
    
    // Step 4: Read results
    const outputData = JSON.parse(await fs.readFile(outputPath, 'utf8'));
    console.log(`📊 Generated ${outputData.forecasts.length} forecast records\n`);
    
    // Step 5: Upload to database
    console.log('📤 Uploading forecasts to database...');
    
    // Delete existing forecasts for Wack-Wack Greenhills
    await client.query(`
      DELETE FROM forecasts 
      WHERE barangay_name = 'Wack-Wack Greenhills'
    `);
    
    await client.query(`
      DELETE FROM forecasts_graphs 
      WHERE barangay = 'Wack-Wack Greenhills'
    `);
    
    // Insert new forecasts
    for (const forecast of outputData.forecasts) {
      await client.query(`
        INSERT INTO forecasts (
          barangay_name, year, month, 
          predicted_cases, lower_bound, upper_bound,
          risk_level, risk_flag, model_used, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        forecast.barangay,
        forecast.year,
        forecast.month,
        forecast.predicted_cases,
        forecast.lower_bound,
        forecast.upper_bound,
        forecast.risk_level,
        forecast.risk_flag,
        forecast.model_used
      ]);
      
      // Insert graph data (historical + forecast)
      const forecastDate = `${forecast.year}-${String(forecast.month).padStart(2, '0')}-01`;
      await client.query(`
        INSERT INTO forecasts_graphs (barangay, record_type, date, value)
        VALUES ($1, 'forecast', $2, $3)
      `, [forecast.barangay, forecastDate, forecast.predicted_cases]);
    }
    
    // Insert historical graph data
    for (const hist of histResult.rows) {
      const [year, month] = hist.date.split('-');
      const histDate = `${year}-${month}-01`;
      await client.query(`
        INSERT INTO forecasts_graphs (barangay, record_type, date, value)
        VALUES ($1, 'historical', $2, $3)
        ON CONFLICT (barangay, record_type, date) DO UPDATE SET value = EXCLUDED.value
      `, ['Wack-Wack Greenhills', histDate, parseInt(hist.incident_count)]);
    }
    
    console.log('✅ Forecasts uploaded successfully!\n');
    
    // Clean up temp files
    await fs.unlink(inputPath);
    await fs.unlink(outputPath);
    
    // Step 6: Verify
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM forecasts 
      WHERE barangay_name = 'Wack-Wack Greenhills'
    `);
    
    console.log(`📊 Verification: ${verifyResult.rows[0].count} forecasts in database`);
    console.log('🎉 Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

regenerateForecasts();
