/**
 * Generate Initial 12-Month Forecasts Script
 * 
 * This script generates forecasts for the next 12 months starting from October 2025
 * Run this script to populate the database with initial forecast data
 * 
 * Usage: node generate_initial_12month_forecasts.js
 */

const multi12MonthForecastingService = require('../services/multi12MonthForecastingService');

async function generateInitial12MonthForecasts() {
  try {
    console.log('🚀 Starting initial 12-month forecast generation...');
    console.log('📅 Starting from October 2025 (current month)');
    console.log('🎯 Will generate forecasts for: Oct 2025 → Sep 2026');
    
    // Generate forecasts starting from October 2025
    const results = await multi12MonthForecastingService.generateAndSave12MonthForecasts(2025, 10);
    
    console.log('\n🎉 INITIAL 12-MONTH FORECASTS GENERATED SUCCESSFULLY!');
    console.log('📊 Results Summary:');
    console.log(`   • Start Month: ${results.startMonth}`);
    console.log(`   • Total Forecasts: ${results.totalForecasts}`);
    console.log(`   • Barangays Covered: ${results.barangaysCount}`);
    console.log(`   • Months Covered: ${results.monthsCovered}`);
    console.log(`   • Previous Forecasts Cleared: ${results.deletedPrevious}`);
    console.log(`   • Generated At: ${results.generatedAt}`);
    
    console.log('\n✅ Database is now populated with 12 months of forecasts');
    console.log('🔄 Future fire incidents will automatically trigger forecast updates');
    
    // Show month breakdown
    console.log('\n📅 Forecast Months Generated:');
    let currentYear = 2025;
    let currentMonth = 10;
    
    for (let i = 0; i < 12; i++) {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      console.log(`   ${i + 1}. ${monthNames[currentMonth - 1]} ${currentYear}`);
      
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error generating initial 12-month forecasts:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  console.log('='.repeat(60));
  console.log('  BFP FIRE FORECASTING - INITIAL 12-MONTH SETUP');
  console.log('='.repeat(60));
  
  generateInitial12MonthForecasts();
}

module.exports = { generateInitial12MonthForecasts };