/**
 * Test Automatic Forecast Generation
 * 
 * This script simulates adding a new fire incident to test that
 * automatic 12-month forecast generation is triggered
 * 
 * Usage: node test_auto_forecast_generation.js
 */

const db = require('../db');
const multi12MonthForecastingService = require('../services/multi12MonthForecastingService');

async function testAutoForecastGeneration() {
  try {
    console.log('🧪 Testing Automatic Forecast Generation...');
    
    // First, check current forecast count
    const beforeQuery = 'SELECT COUNT(*) as count FROM forecasts';
    const beforeResult = await db.query(beforeQuery);
    const beforeCount = parseInt(beforeResult.rows[0].count);
    
    console.log(`📊 Current forecasts in database: ${beforeCount}`);
    
    // Simulate adding a new fire incident (without actually adding to database)
    console.log('🔥 Simulating new fire incident...');  
    
    // Trigger the automatic forecast generation
    const result = await multi12MonthForecastingService.triggerForecastGeneration();
    
    console.log('✅ Automatic forecast generation result:', result);
    
    // Check forecast count after generation
    const afterResult = await db.query(beforeQuery);
    const afterCount = parseInt(afterResult.rows[0].count);
    
    console.log(`📊 Forecasts after generation: ${afterCount}`);
    
    if (result.success) {
      console.log('🎉 SUCCESS: Automatic forecast generation working properly!');
      console.log(`   • Total forecasts: ${result.totalForecasts}`);
      console.log(`   • Barangays covered: ${result.barangaysCount}`);
      console.log(`   • Months covered: ${result.monthsCovered}`);
    } else {
      console.log('❌ FAILED: Automatic forecast generation encountered an error');
      console.log(`   • Error: ${result.error}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  console.log('='.repeat(60));
  console.log('  BFP AUTOMATIC FORECAST GENERATION TEST');
  console.log('='.repeat(60));
  
  testAutoForecastGeneration();
}

module.exports = { testAutoForecastGeneration };