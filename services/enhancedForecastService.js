/**
 * Enhanced ARIMA/SARIMAX Forecast Generator Service
 * 
 * This service:
 * 1. Fetches historical fire data from PostgreSQL
 * 2. Prepares data in the format expected by Python script
 * 3. Calls the arima_forecast_12months.py (Colab-validated methodology)
 * 4. Parses results and stores in database
 * 5. Provides model selection details and diagnostics
 */

const db = require('../config/db');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class EnhancedForecastService {
  constructor() {
    this.pythonScript = path.join(__dirname, '../forecasting/arima_forecast_12months.py');
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
  async prepareInputFile(historicalData, forecastMonths = 13, targetDate = null) {
    await this.ensureTempDir();

    const now = new Date();
    // Forecast starts from current month
    const forecastStartObj = new Date(now.getFullYear(), now.getMonth(), 1);
    const startYear = forecastStartObj.getFullYear();
    const startMonth = forecastStartObj.getMonth() + 1; // JavaScript months are 0-indexed

    const inputData = {
      historical_data: historicalData.map(row => ({
        barangay: row.barangay,
        date: row.date + '-01', // Add day for ISO format
        incident_count: parseInt(row.incident_count)
      })),
      start_year: startYear,
      start_month: startMonth
    };

    const inputFile = path.join(this.tempDir, `forecast_input_${Date.now()}.json`);
    await fs.writeFile(inputFile, JSON.stringify(inputData, null, 2));

    console.log(`📝 Input file prepared: ${inputFile}`);
    console.log(`   - Barangays: ${new Set(historicalData.map(r => r.barangay)).size}`);
    console.log(`   - Date range: ${historicalData[0]?.date} to ${historicalData[historicalData.length - 1]?.date}`);
    console.log(`   - Start: ${startYear}-${startMonth.toString().padStart(2, '0')}`);
    console.log(`   - Forecast months: 12`);

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
      const pythonCmd = fsSync.existsSync('/opt/venv/bin/python3') ? '/opt/venv/bin/python3' : 'py';
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
      
      // Handle new format from arima_forecast_12months.py
      if (results.all_forecasts) {
        console.log(`   - Total forecasts: ${results.all_forecasts.length}`);
        console.log(`   - Barangays covered: ${results.barangays_count}`);
        console.log(`   - Months covered: ${results.total_months}`);
        console.log(`   - Start: ${results.start_year}-${results.start_month}`);
      } else if (results.forecasts) {
        // Legacy format support
        console.log(`   - Total forecasts: ${results.forecasts.length}`);
        console.log(`   - Successful barangays: ${results.metadata?.successful_forecasts}`);
        console.log(`   - Total barangays: ${results.metadata?.total_barangays}`);
      } else {
        console.log(`   - ⚠️ WARNING: No forecast data found!`);
        console.log(`   - Available keys:`, Object.keys(results).join(', '));
      }

      return results;
    } catch (err) {
      console.error('❌ Error parsing forecast results:', err.message);
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
        // Handle both old and new format
        let year, month;
        if (forecast.year && forecast.month) {
          // New format from arima_forecast_12months.py
          year = parseInt(forecast.year);
          month = parseInt(forecast.month);
        } else if (forecast.forecast_month) {
          // Old format - parse date
          const forecastDate = new Date(forecast.forecast_month);
          year = forecastDate.getFullYear();
          month = forecastDate.getMonth() + 1;
        } else {
          console.warn(`⚠️ Skipping forecast with invalid date format:`, forecast);
          continue;
        }

        // Validate year and month are valid integers
        if (isNaN(year) || isNaN(month) || year < 2000 || year > 2100 || month < 1 || month > 12) {
          console.warn(`⚠️ Skipping forecast with invalid year/month: ${year}-${month} for ${forecast.barangay_name || forecast.barangay}`);
          continue;
        }

        // Validate numeric values and convert NaN to null
        const predicted_cases = isNaN(parseFloat(forecast.predicted_cases)) ? null : parseFloat(forecast.predicted_cases);
        const lower_bound = isNaN(parseFloat(forecast.lower_bound)) ? null : parseFloat(forecast.lower_bound);
        const upper_bound = isNaN(parseFloat(forecast.upper_bound)) ? null : parseFloat(forecast.upper_bound);

        // Skip if predicted_cases is null (invalid forecast)
        if (predicted_cases === null) {
          console.warn(`⚠️ Skipping forecast with NaN predicted_cases for ${forecast.barangay_name || forecast.barangay} ${year}-${month}`);
          continue;
        }
        
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
          forecast.barangay_name || forecast.barangay,
          year,
          month,
          predicted_cases,
          lower_bound,
          upper_bound,
          forecast.risk_level || 'Unknown',
          forecast.risk_flag === 'Watchlist' || forecast.risk_flag === true,
          forecast.model_used || 'ARIMA/SARIMAX',
          forecast.confidence_interval || 0.95,
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
   * Store graph data in database for visualization
   * This includes actual, fitted, forecast, CI bounds, and moving averages
   */
  async storeGraphDataInDatabase(graphData) {
    if (!graphData || graphData.length === 0) {
      console.log('⚠️ No graph data to store');
      return 0;
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      console.log(`📊 Storing ${graphData.length} graph data records...`);

      // First check if table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'forecasts_graphs'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.error('❌ ERROR: forecasts_graphs table does not exist!');
        console.error('   Run migration to create the table first.');
        await client.query('ROLLBACK');
        return 0;
      }
      
      console.log('   ✅ Table exists, proceeding with data storage...');

      // Delete all existing graph data (fresh start on each generation)
      const deleteResult = await client.query('DELETE FROM forecasts_graphs');
      console.log(`   Cleared ${deleteResult.rowCount || 0} existing graph data records`);

      // Batch insert for performance
      const batchSize = 500;
      let insertCount = 0;

      for (let i = 0; i < graphData.length; i += batchSize) {
        const batch = graphData.slice(i, i + batchSize);
        
        // Build VALUES clause for batch insert
        const values = [];
        const params = [];
        let paramIndex = 1;

        for (const record of batch) {
          values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
          params.push(
            record.barangay,
            record.record_type,
            record.date,
            record.value
          );
          paramIndex += 4;
        }

        const insertQuery = `
          INSERT INTO forecasts_graphs (barangay, record_type, date, value)
          VALUES ${values.join(', ')}
          ON CONFLICT (barangay, record_type, date) 
          DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
        `;

        await client.query(insertQuery, params);
        insertCount += batch.length;

        if (i + batchSize < graphData.length) {
          console.log(`   Progress: ${insertCount}/${graphData.length} records inserted`);
        }
      }

      await client.query('COMMIT');
      console.log(`✅ Stored ${insertCount} graph data records successfully`);

      // Summary by record type
      const summaryResult = await client.query(`
        SELECT record_type, COUNT(*) as count 
        FROM forecasts_graphs 
        GROUP BY record_type 
        ORDER BY record_type
      `);
      
      console.log('   Graph data summary by type:');
      summaryResult.rows.forEach(row => {
        console.log(`     - ${row.record_type}: ${row.count} records`);
      });

      return insertCount;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Error storing graph data:', err.message);
      console.error('   Error code:', err.code);
      console.error('   Error detail:', err.detail);
      console.error('   Full error:', err);
      // Don't throw - return 0 to indicate failure but continue
      return 0;
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
      console.log('\nStep 4/6: Parsing forecast results...');
      const results = await this.parseForecastResults(outputFile);
      console.log('✅ Step 4 complete - results parsed');

      // Normalize results format (handle both old and new Python script outputs)
      const forecasts = results.all_forecasts || results.forecasts || [];
      const metadata = results.metadata || {
        total_barangays: results.barangays_count || 0,
        successful_forecasts: results.barangays_count || 0,
        transform_method: 'log1p/expm1',
        models_summary: {}
      };

      // Step 5: Store forecasts in database
      console.log('\nStep 5/6: Storing forecasts in database...');
      const insertCount = await this.storeForecastsInDatabase(forecasts, metadata);

      // Step 6: Store graph data in database (NEW)
      console.log('\nStep 6/6: Storing graph data for visualization...');
      const graphInsertCount = await this.storeGraphDataInDatabase(results.graph_data || []);

      // Cleanup
      if (!keepTempFiles) {
        await this.cleanup(inputFile, outputFile);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Forecast Generation Complete`);
      console.log(`${'='.repeat(60)}`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Forecasts generated: ${forecasts.length}`);
      console.log(`   Forecasts stored: ${insertCount}`);
      console.log(`   Graph records stored: ${graphInsertCount}`);
      console.log(`   Barangays processed: ${metadata.total_barangays}`);
      console.log(`   Successful: ${metadata.successful_forecasts}`);
      console.log(`   Transform method: ${metadata.transform_method || 'N/A'}`);
      console.log(`   Random seed: ${metadata.random_seed || 'N/A'}`);
      console.log(`${'='.repeat(60)}\n`);

      return {
        success: true,
        duration: parseFloat(duration),
        forecasts_generated: forecasts.length,
        forecasts_stored: insertCount,
        graph_records_stored: graphInsertCount,
        barangays_processed: metadata.total_barangays,
        successful_barangays: metadata.successful_forecasts,
        models_summary: metadata.models_summary,
        metadata: metadata
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
