const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const forecastingService = require('./forecastingService');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.jobs = new Map();
  }

  // Start the scheduler service
  start() {
    if (this.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Starting monthly forecasting scheduler...');
    
    // Run on the last day of every month at 11:30 PM
    // This cron expression: '30 23 28-31 * *' runs at 11:30 PM on days 28-31 of every month
    // We'll add logic to ensure it only runs on the actual last day
    const monthlyJob = cron.schedule('30 23 28-31 * *', async () => {
      await this.runMonthlyForecasting();
    }, {
      scheduled: false,
      timezone: 'Asia/Manila' // Adjust timezone as needed
    });

    this.jobs.set('monthly-forecasting', monthlyJob);
    monthlyJob.start();

    this.isRunning = true;
    console.log('[Scheduler] Monthly forecasting scheduled for last day of each month at 11:30 PM');
  }

  // Stop the scheduler service
  stop() {
    if (!this.isRunning) {
      console.log('[Scheduler] Not running');
      return;
    }

    console.log('[Scheduler] Stopping scheduler...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`[Scheduler] Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('[Scheduler] Scheduler stopped');
  }

  // Check if today is the last day of the month
  isLastDayOfMonth() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // If tomorrow is in a different month, today is the last day
    return tomorrow.getMonth() !== today.getMonth();
  }

  // Main monthly forecasting execution
  async runMonthlyForecasting() {
    // Only run if it's actually the last day of the month
    if (!this.isLastDayOfMonth()) {
      console.log('[Scheduler] Not the last day of month, skipping...');
      return;
    }

    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth() + 1;

    console.log(`[Scheduler] Starting monthly forecasting for ${year}-${month.toString().padStart(2, '0')}`);

    try {
      // Step 1: Check if forecasts already exist for next month
      const existingForecasts = await forecastingService.getForecastsForMonth(year, month);
      
      if (existingForecasts && existingForecasts.length > 0) {
        console.log(`[Scheduler] Forecasts already exist for ${year}-${month}, cleaning up first...`);
        await forecastingService.clearForecastsForMonth(year, month);
      }

      // Step 2: Fetch historical data for all barangays
      console.log('[Scheduler] Fetching historical data...');
      const historicalData = await forecastingService.fetchHistoricalData();
      
      if (!historicalData || Object.keys(historicalData).length === 0) {
        throw new Error('No historical data available for forecasting');
      }

      console.log(`[Scheduler] Historical data fetched for ${Object.keys(historicalData).length} barangays`);

      // Step 3: Prepare data for Python ARIMA script
      const pythonInput = {
        historical_data: historicalData,
        target_year: year,
        target_month: month,
        generated_at: new Date().toISOString()
      };

      // Step 4: Write input data to temporary file
      const fs = require('fs');
      const inputFile = path.join(__dirname, '../forecasting/monthly_input.json');
      const outputFile = path.join(__dirname, '../forecasting/monthly_output.json');
      
      // Clean up any existing files
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      
      fs.writeFileSync(inputFile, JSON.stringify(pythonInput, null, 2));
      console.log('[Scheduler] Input data prepared for Python script');

      // Step 5: Execute Python ARIMA forecasting script
      console.log('[Scheduler] Running ARIMA forecasting...');
      await this.executePythonScript(inputFile, outputFile);

      // Step 6: Read and process Python output
      if (!fs.existsSync(outputFile)) {
        throw new Error('Python script did not generate output file');
      }

      const forecastResults = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      console.log(`[Scheduler] ARIMA forecasting completed, ${forecastResults.forecasts.length} predictions generated`);

      // Step 7: Store forecasts in database
      let successCount = 0;
      for (const forecast of forecastResults.forecasts) {
        try {
          await forecastingService.storeForecast({
            barangay_name: forecast.barangay,
            year: forecast.year,
            month: forecast.month,
            predicted_cases: forecast.predicted_cases,
            lower_bound: forecast.lower_bound,
            upper_bound: forecast.upper_bound,
            risk_level: forecast.risk_level,
            risk_flag: forecast.risk_flag,
            model_accuracy: forecast.model_accuracy || null,
            generated_at: new Date()
          });
          successCount++;
        } catch (error) {
          console.error(`[Scheduler] Failed to store forecast for ${forecast.barangay}:`, error.message);
        }
      }

      console.log(`[Scheduler] Successfully stored ${successCount}/${forecastResults.forecasts.length} forecasts`);

      // Step 8: Clean up temporary files
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

      console.log(`[Scheduler] Monthly forecasting completed successfully for ${year}-${month.toString().padStart(2, '0')}`);

    } catch (error) {
      console.error('[Scheduler] Monthly forecasting failed:', error.message);
      console.error('[Scheduler] Stack trace:', error.stack);
    }
  }

  // Execute Python ARIMA script
  executePythonScript(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../forecasting/arima_forecast_12months.py');
      const command = `python "${pythonScript}" "${inputFile}" "${outputFile}"`;
      
      console.log(`[Scheduler] Executing: ${command}`);
      
      const process = exec(command, {
        cwd: path.join(__dirname, '../forecasting'),
        timeout: 300000 // 5 minutes timeout
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data;
        console.log(`[Python]: ${data.toString().trim()}`);
      });

      process.stderr.on('data', (data) => {
        stderr += data;
        console.error(`[Python Error]: ${data.toString().trim()}`);
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log('[Scheduler] Python script executed successfully');
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Python script failed with exit code ${code}. stderr: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to execute Python script: ${error.message}`));
      });
    });
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      nextRun: this.getNextRunTime()
    };
  }

  // Calculate next run time (last day of current month)
  getNextRunTime() {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // If we're already past the last day of this month, calculate for next month
    if (now.getDate() > lastDayOfMonth.getDate() || 
        (now.getDate() === lastDayOfMonth.getDate() && now.getHours() >= 23 && now.getMinutes() >= 30)) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      nextMonth.setHours(23, 30, 0, 0);
      return nextMonth;
    }
    
    lastDayOfMonth.setHours(23, 30, 0, 0);
    return lastDayOfMonth;
  }

  // Manual trigger for testing (admin only)
  async triggerManualForecasting(targetYear, targetMonth) {
    console.log(`[Scheduler] Manual trigger requested for ${targetYear}-${targetMonth}`);
    
    // Temporarily override the month check for manual triggers
    const originalMethod = this.isLastDayOfMonth;
    this.isLastDayOfMonth = () => true;
    
    try {
      // Set the target date for manual forecasting
      const originalDate = Date;
      global.Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            // For new Date() calls, return last day of previous month
            const target = new originalDate(targetYear, targetMonth - 1, 0);
            return target;
          }
          return new originalDate(...args);
        }
        
        static now() {
          return new originalDate(targetYear, targetMonth - 1, 0).getTime();
        }
      };
      
      await this.runMonthlyForecasting();
      
      // Restore original Date
      global.Date = originalDate;
      
    } finally {
      // Restore original method
      this.isLastDayOfMonth = originalMethod;
    }
  }
}

module.exports = new SchedulerService();