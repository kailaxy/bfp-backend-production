const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const db = require('../db');

class ForecastingService {
  constructor() {
    this.pythonScript = path.join(__dirname, '../forecasting/arima_forecast.py');
    this.tempDir = path.join(__dirname, '../temp');
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  /**
   * Fetch historical fire incident data from database
   * @param {number} years - Number of years back to fetch data
   * @returns {Array} Historical data in format expected by Python script
   */
  async fetchHistoricalData(years = 15) {
    const query = `
      SELECT 
        barangay,
        DATE_TRUNC('month', resolved_at) as month_date,
        COUNT(*) as incident_count
      FROM historical_fires 
      WHERE resolved_at >= NOW() - INTERVAL '${years} years'
        AND barangay IS NOT NULL
        AND resolved_at IS NOT NULL
      GROUP BY barangay, DATE_TRUNC('month', resolved_at)
      ORDER BY barangay, month_date
    `;

    try {
      const result = await db.query(query);
      
      // Transform to format expected by Python script
      return result.rows.map(row => ({
        barangay: row.barangay,
        date: row.month_date.toISOString().substring(0, 7), // YYYY-MM format
        incident_count: parseInt(row.incident_count)
      }));
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw new Error('Failed to fetch historical fire data');
    }
  }

  /**
   * Generate forecasts using Python ARIMA script
   * @param {number} targetYear - Year to forecast
   * @param {number} targetMonth - Month to forecast (1-12)
   * @returns {Array} Forecast results per barangay
   */
  async generateForecasts(targetYear, targetMonth) {
    await this.ensureTempDir();
    
    // Fetch historical data
    console.log('Fetching historical fire data...');
    const historicalData = await this.fetchHistoricalData();
    
    if (historicalData.length === 0) {
      throw new Error('No historical data available for forecasting');
    }

    // Write data to temporary JSON file
    const tempDataFile = path.join(this.tempDir, `historical_data_${Date.now()}.json`);
    await fs.writeFile(tempDataFile, JSON.stringify(historicalData, null, 2));

    try {
      // Execute Python script
      console.log(`Generating forecasts for ${targetYear}-${targetMonth.toString().padStart(2, '0')}...`);
      const results = await this.runPythonScript(tempDataFile, targetYear, targetMonth);
      
      // Clean up temp file
      await fs.unlink(tempDataFile);
      
      return results;
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempDataFile);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Execute the Python ARIMA script
   * @param {string} dataFile - Path to JSON data file
   * @param {number} targetYear - Target year
   * @param {number} targetMonth - Target month
   * @returns {Promise<Array>} Parsed results from Python script
   */
  runPythonScript(dataFile, targetYear, targetMonth) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('py', [
        this.pythonScript,
        dataFile,
        targetYear.toString(),
        targetMonth.toString()
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', stderr);
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const results = JSON.parse(stdout);
          resolve(results);
        } catch (parseError) {
          console.error('Error parsing Python script output:', parseError);
          console.error('Raw output:', stdout);
          reject(new Error('Failed to parse forecast results'));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * Save forecast results to database
   * @param {Array} forecasts - Array of forecast objects
   * @returns {Promise<void>}
   */
  async saveForecastsToDatabase(forecasts) {
    const query = `
      INSERT INTO forecasts (
        barangay_name, month, year, predicted_cases, 
        lower_bound, upper_bound, risk_level, risk_flag, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (barangay_name, month, year) 
      DO UPDATE SET 
        predicted_cases = EXCLUDED.predicted_cases,
        lower_bound = EXCLUDED.lower_bound,
        upper_bound = EXCLUDED.upper_bound,
        risk_level = EXCLUDED.risk_level,
        risk_flag = EXCLUDED.risk_flag,
        created_at = NOW()
    `;

    try {
      for (const forecast of forecasts) {
        await db.query(query, [
          forecast.barangay_name,
          forecast.month,
          forecast.year,
          forecast.predicted_cases,
          forecast.lower_bound,
          forecast.upper_bound,
          forecast.risk_level,
          forecast.risk_flag
        ]);
      }
      console.log(`Saved ${forecasts.length} forecasts to database`);
    } catch (error) {
      console.error('Error saving forecasts to database:', error);
      throw new Error('Failed to save forecasts to database');
    }
  }

  /**
   * Get forecasts for a specific month
   * @param {number} year - Target year
   * @param {number} month - Target month
   * @returns {Promise<Array>} Existing forecasts
   */
  async getForecastsForMonth(year, month) {
    try {
      const query = `
        SELECT * FROM forecasts 
        WHERE year = $1 AND month = $2
        ORDER BY barangay_name
      `;
      const result = await db.query(query, [year, month]);
      return result.rows;
    } catch (error) {
      console.error('[ForecastingService] Error fetching forecasts for month:', error);
      throw error;
    }
  }

  /**
   * Clear forecasts for a specific month
   * @param {number} year - Target year
   * @param {number} month - Target month
   * @returns {Promise<number>} Number of deleted rows
   */
  async clearForecastsForMonth(year, month) {
    try {
      const query = `
        DELETE FROM forecasts 
        WHERE year = $1 AND month = $2
      `;
      const result = await db.query(query, [year, month]);
      console.log(`[ForecastingService] Cleared ${result.rowCount} forecasts for ${year}-${month}`);
      return result.rowCount;
    } catch (error) {
      console.error('[ForecastingService] Error clearing forecasts:', error);
      throw error;
    }
  }

  /**
   * Store individual forecast in database
   * @param {Object} forecastData - Forecast data object
   * @returns {Promise<void>}
   */
  async storeForecast(forecastData) {
    const query = `
      INSERT INTO forecasts (
        barangay_name, month, year, predicted_cases, 
        lower_bound, upper_bound, risk_level, risk_flag, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (barangay_name, month, year) 
      DO UPDATE SET 
        predicted_cases = EXCLUDED.predicted_cases,
        lower_bound = EXCLUDED.lower_bound,
        upper_bound = EXCLUDED.upper_bound,
        risk_level = EXCLUDED.risk_level,
        risk_flag = EXCLUDED.risk_flag,
        created_at = NOW()
    `;

    try {
      await db.query(query, [
        forecastData.barangay_name,
        forecastData.month,
        forecastData.year,
        forecastData.predicted_cases,
        forecastData.lower_bound,
        forecastData.upper_bound,
        forecastData.risk_level,
        forecastData.risk_flag
      ]);
    } catch (error) {
      console.error('[ForecastingService] Error storing forecast:', error);
      throw error;
    }
  }

  /**
   * Generate and save monthly forecasts (for cron job)
   * @param {number} targetYear - Year to forecast
   * @param {number} targetMonth - Month to forecast
   * @returns {Promise<Array>} Generated forecasts
   */
  async generateMonthlyForecasts(targetYear, targetMonth) {
    try {
      console.log(`Starting forecast generation for ${targetYear}-${targetMonth.toString().padStart(2, '0')}`);
      
      const forecasts = await this.generateForecasts(targetYear, targetMonth);
      await this.saveForecastsToDatabase(forecasts);
      
      console.log(`Successfully generated forecasts for ${forecasts.length} barangays`);
      return forecasts;
    } catch (error) {
      console.error('Error in monthly forecast generation:', error);
      throw error;
    }
  }
}

module.exports = new ForecastingService();