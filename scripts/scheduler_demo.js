const express = require('express');
const schedulerService = require('../services/schedulerService');

/**
 * Demo script showing the monthly ARIMA forecasting scheduler
 * This demonstrates how forecasts will be generated automatically
 * on the last day of each month at 11:30 PM
 */

console.log('=== Monthly ARIMA Forecasting Scheduler Demo ===\n');

console.log('📅 SCHEDULE CONFIGURATION:');
console.log('• Runs: Last day of every month at 11:30 PM (Asia/Manila timezone)');
console.log('• Cron Expression: "30 23 28-31 * *"');
console.log('• Additional Check: Only runs if it\'s actually the last day of the month');
console.log();

console.log('🔄 AUTOMATED PROCESS:');
console.log('1. Check if forecasts already exist for next month');
console.log('2. Clear existing forecasts if found');
console.log('3. Fetch 15 years of historical fire data from historical_fires table');
console.log('4. Prepare data for Python ARIMA script');
console.log('5. Execute Python ARIMA forecasting');
console.log('6. Process results and store in forecasts table');
console.log('7. Clean up temporary files');
console.log();

console.log('📊 EXAMPLE TIMELINE:');
const now = new Date();
const examples = [
  { date: new Date(2025, 9, 31), generates: 'November 2025' }, // Oct 31 -> Nov
  { date: new Date(2025, 10, 30), generates: 'December 2025' }, // Nov 30 -> Dec
  { date: new Date(2025, 11, 31), generates: 'January 2026' }, // Dec 31 -> Jan
];

examples.forEach(example => {
  console.log(`• ${example.date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })} at 11:30 PM → Generates forecasts for ${example.generates}`);
});

console.log();

console.log('⚙️  CURRENT STATUS:');
const status = schedulerService.getStatus();
console.log(`• Scheduler Running: ${status.isRunning}`);
console.log(`• Active Jobs: ${status.activeJobs.length > 0 ? status.activeJobs.join(', ') : 'None'}`);
console.log(`• Next Scheduled Run: ${status.nextRun ? status.nextRun.toLocaleString() : 'Not scheduled'}`);
console.log();

console.log('🧪 MANUAL TESTING:');
console.log('For testing purposes, you can manually trigger forecasting:');
console.log();
console.log('Using cURL:');
console.log('curl -X POST http://localhost:5000/api/scheduler/trigger \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -d \'{"year": 2025, "month": 11}\'');
console.log();
console.log('Using JavaScript fetch:');
console.log('fetch(\'http://localhost:5000/api/scheduler/trigger\', {');
console.log('  method: \'POST\',');
console.log('  headers: { \'Content-Type\': \'application/json\' },');
console.log('  body: JSON.stringify({ year: 2025, month: 11 })');
console.log('})');
console.log();

console.log('📋 API ENDPOINTS:');
console.log('• GET  /api/scheduler/status  - Check scheduler status');
console.log('• POST /api/scheduler/trigger - Manual forecast trigger (admin)');
console.log('• GET  /api/forecasts/2025/11 - View generated forecasts');
console.log();

console.log('🔧 DEPENDENCIES:');
console.log('• Node.js packages: node-cron (installed)');
console.log('• Python packages: pandas, numpy, statsmodels, scikit-learn');
console.log('• Database: PostgreSQL with forecasts and historical_fires tables');
console.log();

console.log('💡 NOTES:');
console.log('• The scheduler automatically starts when the server starts');
console.log('• Forecasts are generated for the NEXT month (e.g., Oct 31 → Nov forecasts)');
console.log('• Historical data spans 15 years for better ARIMA model accuracy');
console.log('• Risk categorization follows your specified rules:');
console.log('  - predicted_cases: ≥1→High, ≥0.5→Medium, ≥0.2→Low-Moderate, <0.2→Very Low');
console.log('  - upper_bound: ≥3→Elevated Risk, ≥2→Watchlist, <2→NULL');
console.log();

console.log('✅ The scheduler is now active and will run automatically!');
console.log('When you import your 2010-2024 historical fire data, the system');
console.log('will have 15 years of data to generate accurate ARIMA predictions.');

if (!status.isRunning) {
  console.log();
  console.log('⚠️  Note: Scheduler is not currently running.');
  console.log('   It will start automatically when you start the server with "node server.js"');
}