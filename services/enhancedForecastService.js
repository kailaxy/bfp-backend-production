/**
 * Enhanced ARIMA/SARIMAX Forecast Generator Service
 * 
 * This service:
 * 1. Fetches historical fire data from PostgreSQL
 * 2. Prepares data in the format expected by Python script
 * 3. Calls the enhanced arima_forecast_v2.py
 * 4. Parses results and stores in database
 * 5. Provides model selection details and diagnostics
 */

const db = require('../config/db');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class EnhancedForecastService {
  constructor() {
    this.pythonScript = path.join(__dirname, '../forecasting/arima_forecast_v2.py');
    this.tempDir = path.join(__dirname, '../temp');
  }

  /**
   * Ensure temp directory exists
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create temp directory:', err);
    }
  }

  /**
   * Fetch historical fire data from database
   * Groups by barangay and month
   */
  async fetchHistoricalData() {
    const query = `
      SELECT 
        barangay,
        TO_CHAR(reported_at, 'YYYY-MM') as date,
        COUNT(*) as incident_count
      FROM historical_fires
      WHERE barangay IS NOT NULL 
        AND barangay != ''
        AND reported_at IS NOT NULL
      GROUP BY barangay, TO_CHAR(reported_at, 'YYYY-MM')
      ORDER BY barangay, date
    `;

    try {
      const result = await db.query(query);
      console.log(`📊 Fetched ${result.rows.length} barangay-month records from database`);
      return result.rows;
    } catch (err) {
      console.error('❌ Error fetching historical data:', err);
      throw err;
    }
  }

  /**
   * Prepare input JSON for Python script
   */
  async prepareInputFile(historicalData, forecastMonths = 12, targetDate = null) {
    await this.ensureTempDir();

    const now = new Date();
    // Forecast starts from current month
    const forecastStartObj = new Date(now.getFullYear(), now.getMonth(), 1);
    const forecastStart = forecastStartObj.toISOString().split('T')[0];
    
    // Default target date to forecastMonths from now
    if (!targetDate) {
      const targetDateObj = new Date(now.getFullYear(), now.getMonth() + forecastMonths, 1);
      targetDate = targetDateObj.toISOString().split('T')[0];
    }

    const inputData = {
      historical_data: historicalData.map(row => ({
        barangay: row.barangay,
        date: row.date + '-01', // Add day for ISO format
        incident_count: parseInt(row.incident_count)
      })),
      forecast_months: forecastMonths,
      forecast_start: forecastStart,
      target_date: targetDate
    };

    const inputFile = path.join(this.tempDir, `forecast_input_${Date.now()}.json`);
    await fs.writeFile(inputFile, JSON.stringify(inputData, null, 2));

    console.log(`📝 Input file prepared: ${inputFile}`);
    console.log(`   - Barangays: ${new Set(historicalData.map(r => r.barangay)).size}`);
    console.log(`   - Date range: ${historicalData[0]?.date} to ${historicalData[historicalData.length - 1]?.date}`);
    console.log(`   - Forecast months: ${forecastMonths}`);
    console.log(`   - Target date: ${targetDate}`);

    return inputFile;
  }

  /**
   * Execute Python forecasting script
   */
  async executePythonScript(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
      console.log(`🐍 Executing Python script...`);
      console.log(`   Script: ${this.pythonScript}`);
      console.log(`   Input: ${inputFile}`);
      console.log(`   Output: ${outputFile}`);

      // Use venv Python if available (Railway), otherwise system Python
      const fsSync = require('fs');
      const pythonCmd = fsSync.existsSync('/opt/venv/bin/python3') ? '/opt/venv/bin/python3' : 'python';
      console.log(`   Using Python: ${pythonCmd}`);
      
      // Set working directory to backend root
      const backendRoot = path.join(__dirname, '..');
      console.log(`   Working directory: ${backendRoot}`);
      
      // Set up environment to avoid numpy import issues
      const env = { ...process.env };
      
      // If using venv, ensure clean Python environment
      if (pythonCmd === '/opt/venv/bin/python3') {
        // Clear all Python-related environment variables that might cause conflicts
        delete env.PYTHONPATH;
        delete env.PYTHONHOME;
        delete env.PYTHONSTARTUP;
        
        // Set venv environment
        env.VIRTUAL_ENV = '/opt/venv';
        env.PATH = `/opt/venv/bin:${env.PATH}`;
        
        // Set LD_LIBRARY_PATH to include Nix system libraries for Python C-extensions
        const libPaths = '/nix/store/*-zlib-*/lib:/nix/store/*-gcc-*/lib';
        env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH ? `${libPaths}:${env.LD_LIBRARY_PATH}` : libPaths;
        
        console.log(`   Environment: VIRTUAL_ENV=/opt/venv, PATH=${env.PATH.split(':')[0]}`);
        console.log(`   LD_LIBRARY_PATH includes zlib and libstdc++ for Python packages`);
      }
      
      const pythonProcess = spawn(pythonCmd, [this.pythonScript, inputFile, outputFile], {
        env,
        cwd: backendRoot
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[Python] ${output.trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`[Python Error] ${output.trim()}`);
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}\nStderr: ${stderr}`));
        } else {
          console.log(`✅ Python script completed successfully`);
          resolve({ stdout, stderr });
        }
      });

      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });
    });
  }

  /**
   * Parse forecast results from output file
   */
  async parseForecastResults(outputFile) {
    try {
      const content = await fs.readFile(outputFile, 'utf8');
      const results = JSON.parse(content);

      console.log(`📊 Forecast Results Summary:`);
      console.log(`   - Total forecasts: ${results.forecasts.length}`);
      console.log(`   - Successful barangays: ${results.metadata.successful_forecasts}`);
      console.log(`   - Total barangays: ${results.metadata.total_barangays}`);

      return results;
    } catch (err) {
      console.error('❌ Error parsing forecast results:', err);
      throw err;
    }
  }

  /**
   * Store forecasts in database
   */
  async storeForecastsInDatabase(forecasts, metadata) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      console.log(`💾 Storing ${forecasts.length} forecasts in database...`);

      // Store each forecast
      let insertCount = 0;
      for (const forecast of forecasts) {
        // Parse forecast_month to extract year and month
        const forecastDate = new Date(forecast.forecast_month);
        const year = forecastDate.getFullYear();
        const month = forecastDate.getMonth() + 1; // JavaScript months are 0-indexed
        
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
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
          forecast.barangay,
          year,
          month,
          forecast.predicted_cases,
          forecast.lower_bound,
          forecast.upper_bound,
          forecast.risk_level,
          forecast.risk_flag === true,
          forecast.model_used,
          forecast.confidence_interval,
          metadata.generated_at
        ]);

        insertCount++;
      }

      await client.query('COMMIT');
      console.log(`✅ Stored ${insertCount} forecasts successfully`);

      return insertCount;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Error storing forecasts:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(inputFile, outputFile) {
    try {
      await fs.unlink(inputFile);
      await fs.unlink(outputFile);
      console.log(`🧹 Cleaned up temporary files`);
    } catch (err) {
      console.error('⚠️ Error cleaning up files:', err.message);
    }
  }

  /**
   * Main method: Generate forecasts end-to-end
   */
  async generateForecasts(options = {}) {
    const {
      forecastMonths = 12,
      targetDate = null,
      keepTempFiles = false
    } = options;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔮 Enhanced ARIMA/SARIMAX Forecast Generation Started`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();
    let inputFile, outputFile;

    try {
      // Step 1: Fetch historical data
      console.log('Step 1/5: Fetching historical data...');
      const historicalData = await this.fetchHistoricalData();

      if (historicalData.length === 0) {
        throw new Error('No historical data available for forecasting');
      }

      // Step 2: Prepare input file
      console.log('\nStep 2/5: Preparing input file...');
      inputFile = await this.prepareInputFile(historicalData, forecastMonths, targetDate);

      // Step 3: Execute Python script
      console.log('\nStep 3/5: Running enhanced forecasting models...');
      outputFile = path.join(this.tempDir, `forecast_output_${Date.now()}.json`);
      await this.executePythonScript(inputFile, outputFile);

      // Step 4: Parse results
      console.log('\nStep 4/5: Parsing forecast results...');
      const results = await this.parseForecastResults(outputFile);

      // Step 5: Store in database
      console.log('\nStep 5/5: Storing forecasts in database...');
      const insertCount = await this.storeForecastsInDatabase(
        results.forecasts,
        results.metadata
      );

      // Cleanup
      if (!keepTempFiles) {
        await this.cleanup(inputFile, outputFile);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Forecast Generation Complete`);
      console.log(`${'='.repeat(60)}`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Forecasts generated: ${results.forecasts.length}`);
      console.log(`   Forecasts stored: ${insertCount}`);
      console.log(`   Barangays processed: ${results.metadata.total_barangays}`);
      console.log(`   Successful: ${results.metadata.successful_forecasts}`);
      console.log(`${'='.repeat(60)}\n`);

      return {
        success: true,
        duration: parseFloat(duration),
        forecasts_generated: results.forecasts.length,
        forecasts_stored: insertCount,
        barangays_processed: results.metadata.total_barangays,
        successful_barangays: results.metadata.successful_forecasts,
        models_summary: results.metadata.models_summary,
        metadata: results.metadata
      };

    } catch (err) {
      console.error(`\n❌ Forecast Generation Failed:`);
      console.error(err);

      // Cleanup on error
      if (inputFile && outputFile && !keepTempFiles) {
        await this.cleanup(inputFile, outputFile).catch(() => {});
      }

      throw err;
    }
  }
}

module.exports = new EnhancedForecastService();
