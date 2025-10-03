const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const db = require('../db');

class Multi12MonthForecastingService {
  constructor() {
    this.python12MonthScript = path.join(__dirname, '../forecasting/arima_forecast_12months.py');
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
   * Generate 12 months of forecasts starting from current month using Python ARIMA script
   * @param {number} startYear - Starting year to forecast (default: current year)
   * @param {number} startMonth - Starting month to forecast (default: current month)
   * @returns {Array} Forecast results for 12 months per barangay
   */
  async generate12MonthForecasts(startYear = null, startMonth = null) {
    await this.ensureTempDir();
    
    // Default to current month if not specified
    if (!startYear || !startMonth) {
      const now = new Date();
      startYear = startYear || now.getFullYear();
      startMonth = startMonth || (now.getMonth() + 1);
    }
    
    // Fetch historical data
    console.log('Fetching historical fire data for 12-month forecasting...');
    const historicalData = await this.fetchHistoricalData();
    
    if (historicalData.length === 0) {
      throw new Error('No historical data available for forecasting');
    }

    // Prepare input data for Python script
    const inputData = {
      historical_data: historicalData,
      start_year: startYear,
      start_month: startMonth
    };

    // Write data to temporary JSON files
    const tempInputFile = path.join(this.tempDir, `forecast_input_${Date.now()}.json`);
    const tempOutputFile = path.join(this.tempDir, `forecast_output_${Date.now()}.json`);
    
    await fs.writeFile(tempInputFile, JSON.stringify(inputData, null, 2));

    try {
      // Execute Python script
      console.log(`Generating 12-month forecasts starting from ${startYear}-${startMonth.toString().padStart(2, '0')}...`);
      await this.runPython12MonthScript(tempInputFile, tempOutputFile);
      
      // Read results
      const resultsStr = await fs.readFile(tempOutputFile, 'utf8');
      const results = JSON.parse(resultsStr);
      
      // Clean up temp files
      await fs.unlink(tempInputFile);
      await fs.unlink(tempOutputFile);
      
      return results;
    } catch (error) {
      // Clean up temp files on error
      try {
        await fs.unlink(tempInputFile);
        await fs.unlink(tempOutputFile);
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Execute the Python 12-month ARIMA script
   * @param {string} inputFile - Path to input JSON data file
   * @param {string} outputFile - Path to output JSON results file
   * @returns {Promise<void>}
   */
  runPython12MonthScript(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('py', [
        this.python12MonthScript,
        inputFile,
        outputFile
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('[Python]:', data.toString().trim());
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[Python Error]:', data.toString().trim());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python 12-month script error:', stderr);
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          return;
        }

        console.log('Python 12-month script completed successfully');
        resolve();
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * Save 12 months of forecast results to database
   * @param {Array} allForecasts - Array of all forecast objects for 12 months
   * @returns {Promise<void>}
   */
  async save12MonthForecastsToDatabase(allForecasts) {
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
      console.log(`Saving ${allForecasts.length} forecasts to database...`);
      
      // Group by month for progress tracking
      const forecastsByMonth = {};
      allForecasts.forEach(forecast => {
        const monthKey = `${forecast.year}-${forecast.month.toString().padStart(2, '0')}`;
        if (!forecastsByMonth[monthKey]) {
          forecastsByMonth[monthKey] = [];
        }
        forecastsByMonth[monthKey].push(forecast);
      });

      let totalSaved = 0;
      for (const [monthKey, forecasts] of Object.entries(forecastsByMonth)) {
        console.log(`Saving ${forecasts.length} forecasts for ${monthKey}...`);
        
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
          totalSaved++;
        }
        
        console.log(`✅ Saved ${forecasts.length} forecasts for ${monthKey}`);
      }
      
      console.log(`🎉 Successfully saved ${totalSaved} total forecasts to database`);
      console.log(`📊 Coverage: ${Object.keys(forecastsByMonth).length} months`);
      
    } catch (error) {
      console.error('Error saving 12-month forecasts to database:', error);
      throw new Error('Failed to save 12-month forecasts to database');
    }
  }

  /**
   * Clear existing forecasts for next 12 months
   * @param {number} startYear - Starting year
   * @param {number} startMonth - Starting month  
   * @returns {Promise<number>} Number of deleted rows
   */
  async clear12MonthForecasts(startYear, startMonth) {
    try {
      const months = [];
      let currentYear = startYear;
      let currentMonth = startMonth;
      
      // Generate 12 month combinations
      for (let i = 0; i < 12; i++) {
        months.push([currentYear, currentMonth]);
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }

      let totalDeleted = 0;
      for (const [year, month] of months) {
        const query = `DELETE FROM forecasts WHERE year = $1 AND month = $2`;
        const result = await db.query(query, [year, month]);
        totalDeleted += result.rowCount;
        console.log(`Cleared ${result.rowCount} forecasts for ${year}-${month.toString().padStart(2, '0')}`);
      }
      
      console.log(`Total cleared: ${totalDeleted} forecasts`);
      return totalDeleted;
    } catch (error) {
      console.error('Error clearing 12-month forecasts:', error);
      throw error;
    }
  }

  /**
   * Generate and save 12 months of forecasts automatically
   * @param {number} startYear - Starting year (default: current year)
   * @param {number} startMonth - Starting month (default: current month)
   * @returns {Promise<Object>} Results summary
   */
  async generateAndSave12MonthForecasts(startYear = null, startMonth = null) {
    try {
      // Default to current month if not specified
      if (!startYear || !startMonth) {
        const now = new Date();
        startYear = startYear || now.getFullYear();
        startMonth = startMonth || (now.getMonth() + 1);
      }

      console.log(`🚀 Starting 12-month forecast generation from ${startYear}-${startMonth.toString().padStart(2, '0')}`);
      
      // Clear existing forecasts for the 12 months
      const deletedCount = await this.clear12MonthForecasts(startYear, startMonth);
      
      // Generate new 12-month forecasts
      const results = await this.generate12MonthForecasts(startYear, startMonth);
      
      // Save to database
      await this.save12MonthForecastsToDatabase(results.all_forecasts);
      
      const summary = {
        success: true,
        startMonth: `${startYear}-${startMonth.toString().padStart(2, '0')}`,
        totalForecasts: results.total_predictions,
        barangaysCount: results.barangays_count,
        monthsCovered: results.total_months,
        deletedPrevious: deletedCount,
        generatedAt: new Date().toISOString()
      };
      
      console.log('🎉 12-Month Forecast Generation Complete!');
      console.log('📊 Summary:', summary);
      
      return summary;
    } catch (error) {
      console.error('Error in 12-month forecast generation:', error);
      throw error;
    }
  }

  /**
   * Trigger automatic forecast generation when new historical fire is added
   * This should be called whenever a new fire incident is reported
   * @returns {Promise<Object>} Results summary
   */
  async triggerForecastGeneration() {
    try {
      console.log('🔥 New fire incident detected - triggering 12-month forecast generation...');
      
      // Generate forecasts starting from current month
      const now = new Date();
      const results = await this.generateAndSave12MonthForecasts(now.getFullYear(), now.getMonth() + 1);
      
      console.log('✅ Automatic forecast generation completed');
      return results;
    } catch (error) {
      console.error('❌ Error in automatic forecast generation:', error);
      // Don't throw error to avoid breaking the main fire incident creation
      return {
        success: false,
        error: error.message,
        generatedAt: new Date().toISOString()
      };
    }
  }
}

module.exports = new Multi12MonthForecastingService();