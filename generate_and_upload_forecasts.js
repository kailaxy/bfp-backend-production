#!/usr/bin/env node
/**
 * Local Forecast Generator and Uploader
 * 
 * This script:
 * 1. Fetches historical data from Render production database
 * 2. Generates forecasts locally using Python
 * 3. Uploads forecasts back to production database
 * 
 * Usage:
 *   node generate_and_upload_forecasts.js
 * 
 * Requirements:
 *   - Python 3 installed locally
 *   - pip install pandas numpy statsmodels scipy
 *   - Database connection string in .env
 */

const { Client } = require('pg');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

// Prefer explicit production DB URL env var, fall back to generic DATABASE_URL or RENDER_DATABASE_URL
const PRODUCTION_DB_URL = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL || process.env.RENDER_DATABASE_URL;

if (!PRODUCTION_DB_URL) {
  console.error('❌ PRODUCTION_DATABASE_URL or DATABASE_URL (Render) environment variable is required');
  console.log('\nSet it in your .env file or in the environment:');
  console.log('PRODUCTION_DATABASE_URL=postgresql://user:pass@host:port/database');
  process.exit(1);
}

class LocalForecastGenerator {
  constructor() {
    this.pythonScript = path.join(__dirname, 'forecasting', 'arima_forecast_12months.py');
    this.tempDir = path.join(__dirname, 'temp');
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create temp directory:', err);
    }
  }

  async fetchHistoricalData() {
    // Use the canonical connection string (PRODUCTION_DB_URL) to connect. SSL enablement is handled by the connectionString or env.
    const client = new Client({
      connectionString: PRODUCTION_DB_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    try {
      await client.connect();
      console.log('✅ Connected to production database');

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

      const result = await client.query(query);
      console.log(`📊 Fetched ${result.rows.length} barangay-month records`);
      
      return result.rows;
    } catch (err) {
      console.error('❌ Error fetching historical data:', err);
      throw err;
    } finally {
      await client.end();
    }
  }

  async prepareInputFile(historicalData) {
    await this.ensureTempDir();

    const now = new Date();
    const targetDate = `${now.getFullYear() + 1}-12-01`;

    const inputData = {
      historical_data: historicalData.map(row => ({
        barangay: row.barangay,
        date: row.date,
        incident_count: parseInt(row.incident_count)
      })),
      forecast_months: 12,
      target_date: targetDate
    };

    const inputFile = path.join(this.tempDir, `forecast_input_${Date.now()}.json`);
    await fs.writeFile(inputFile, JSON.stringify(inputData, null, 2));

    console.log(`📝 Input file prepared: ${inputFile}`);
    console.log(`   - Barangays: ${new Set(historicalData.map(r => r.barangay)).size}`);
    console.log(`   - Forecast months: 12`);

    return inputFile;
  }

  getPythonCommand() {
    // Railway uses venv
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RENDER) {
      return '/opt/venv/bin/python3';
    }
    // Windows local
    return 'py';
  }

  async executePythonScript(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
      console.log('🐍 Executing Python forecasting script...');
      console.log('   This may take 2-5 minutes...');

      const pythonCmd = this.getPythonCommand();
      const python = spawn(pythonCmd, [this.pythonScript, inputFile, outputFile], {
        env: { 
          ...process.env, 
          PYTHONIOENCODING: 'utf-8',
          LD_LIBRARY_PATH: '/nix/store/*-zlib-*/lib:/nix/store/*-gcc-*/lib:' + (process.env.LD_LIBRARY_PATH || '')
        }
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write('.');
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        console.log('\n');
        if (code !== 0) {
          console.error(`❌ Python script failed with code ${code}`);
          console.error('Stderr:', stderr);
          reject(new Error(`Python script exited with code ${code}`));
        } else {
          console.log('✅ Python script completed successfully');
          resolve({ stdout, stderr });
        }
      });
    });
  }

  async uploadForecasts(forecasts, metadata) {
    const client = new Client({ 
      host: 'dpg-d35r1s2li9vc738l9f70-a.singapore-postgres.render.com',
      port: 5432,
      database: 'bfpmapping_nua2',
      user: 'bfpmapping_nua2_user',
      password: 'mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L',
      ssl: {
        rejectUnauthorized: false
      }
    });

    try {
      await client.connect();
      await client.query('BEGIN');

      console.log(`💾 Uploading ${forecasts.length} forecasts to production database...`);

      let insertCount = 0;
      for (const forecast of forecasts) {
        const forecastDate = new Date(forecast.forecast_month);
        const year = forecastDate.getFullYear();
        const month = forecastDate.getMonth() + 1;

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
        if (insertCount % 50 === 0) {
          process.stdout.write(`\r   Uploaded ${insertCount}/${forecasts.length} forecasts...`);
        }
      }

      await client.query('COMMIT');
      console.log(`\n✅ Successfully uploaded ${insertCount} forecasts to production!`);

      return insertCount;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Error uploading forecasts:', err);
      throw err;
    } finally {
      await client.end();
    }
  }

  async generateAndUpload() {
    try {
      console.log('🚀 Starting local forecast generation and upload...\n');

      // Step 1: Fetch historical data from production
      console.log('Step 1: Fetching historical data from production database...');
      const historicalData = await this.fetchHistoricalData();

      // Step 2: Prepare input file
      console.log('\nStep 2: Preparing input file for Python script...');
      const inputFile = await this.prepareInputFile(historicalData);

      // Step 3: Execute Python script
      console.log('\nStep 3: Generating forecasts with SARIMAX/ARIMA...');
      const outputFile = path.join(this.tempDir, `forecast_output_${Date.now()}.json`);
      await this.executePythonScript(inputFile, outputFile);

      // Step 4: Parse output
      console.log('\nStep 4: Reading generated forecasts...');
      const outputData = JSON.parse(await fs.readFile(outputFile, 'utf8'));
      
      console.log(`✅ Generated forecasts for ${outputData.forecasts.length} barangay-months`);
      console.log(`   Models used:`, Object.keys(outputData.metadata.models_summary || {}).join(', '));

      // Step 5: Upload to production
      console.log('\nStep 5: Uploading forecasts to production database...');
      await this.uploadForecasts(outputData.forecasts, outputData.metadata);

      // Cleanup
      console.log('\nStep 6: Cleaning up temporary files...');
      await fs.unlink(inputFile);
      await fs.unlink(outputFile);

      console.log('\n✅ 🎉 Complete! Forecasts are now live in production.\n');
      console.log('You can now view them at: https://bfp-frontend.onrender.com/admin/forecasts');

    } catch (err) {
      console.error('\n❌ Error:', err.message);
      process.exit(1);
    }
  }
}

// Run the script
const generator = new LocalForecastGenerator();
generator.generateAndUpload();
