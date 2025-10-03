/**
 * Monthly Forecast Generation Script
 * 
 * This script should be run on the last day of each month to generate
 * forecasts for the following month using ARIMA/SARIMA algorithms.
 * 
 * Usage:
 *   node scripts/generate_monthly_forecasts.js
 *   node scripts/generate_monthly_forecasts.js --year 2025 --month 11
 */

const forecastingService = require('../services/forecastingService');

async function generateNextMonthForecasts(customYear = null, customMonth = null) {
  try {
    let targetYear, targetMonth;
    
    if (customYear && customMonth) {
      // Use custom year/month from command line
      targetYear = parseInt(customYear);
      targetMonth = parseInt(customMonth);
    } else {
      // Calculate next month automatically
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      targetYear = nextMonth.getFullYear();
      targetMonth = nextMonth.getMonth() + 1;
    }
    
    console.log(`=== Monthly Forecast Generation ===`);
    console.log(`Target: ${targetYear}-${targetMonth.toString().padStart(2, '0')}`);
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('');
    
    // Generate forecasts
    const forecasts = await forecastingService.generateMonthlyForecasts(targetYear, targetMonth);
    
    console.log('');
    console.log(`=== Generation Complete ===`);
    console.log(`Generated forecasts for ${forecasts.length} barangays`);
    console.log(`Completed at: ${new Date().toISOString()}`);
    
    // Log summary of risk levels
    const riskSummary = forecasts.reduce((acc, forecast) => {
      acc[forecast.risk_level] = (acc[forecast.risk_level] || 0) + 1;
      return acc;
    }, {});
    
    console.log('');
    console.log('Risk Level Summary:');
    Object.entries(riskSummary).forEach(([level, count]) => {
      console.log(`  ${level}: ${count} barangays`);
    });
    
    // Log high-risk barangays
    const highRisk = forecasts.filter(f => f.risk_flag === true);
    if (highRisk.length > 0) {
      console.log('');
      console.log('🔥 High-Risk Barangays (requiring attention):');
      highRisk.forEach(forecast => {
        console.log(`  • ${forecast.barangay_name}: ${forecast.predicted_cases.toFixed(1)} cases (${forecast.risk_level})`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error generating monthly forecasts:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let customYear = null;
let customMonth = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--year' && args[i + 1]) {
    customYear = args[i + 1];
    i++;
  } else if (args[i] === '--month' && args[i + 1]) {
    customMonth = args[i + 1];
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log('Monthly Forecast Generation Script');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/generate_monthly_forecasts.js                    # Generate for next month');
    console.log('  node scripts/generate_monthly_forecasts.js --year 2025 --month 11  # Generate for specific month');
    console.log('');
    console.log('Options:');
    console.log('  --year YYYY    Target year (e.g., 2025)');
    console.log('  --month MM     Target month (1-12)');
    console.log('  --help, -h     Show this help message');
    process.exit(0);
  }
}

// Validate custom parameters if provided
if ((customYear && !customMonth) || (!customYear && customMonth)) {
  console.error('Error: Both --year and --month must be provided together');
  process.exit(1);
}

if (customYear && customMonth) {
  const year = parseInt(customYear);
  const month = parseInt(customMonth);
  
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    console.error('Error: Invalid year or month. Month must be 1-12.');
    process.exit(1);
  }
}

// Run the forecast generation
generateNextMonthForecasts(customYear, customMonth);