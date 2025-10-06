/**
 * Production Forecast Generator
 * Run this script on Render backend to generate 12-month forecasts
 * Usage: node scripts/generate_production_forecasts.js
 */

const multi12MonthForecastingService = require('../services/multi12MonthForecastingService');

async function generateProductionForecasts() {
  try {
    console.log('🚀 PRODUCTION FORECAST GENERATION STARTING...');
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
    console.log('📅 Target: October 2025 → September 2026');
    
    // Test database connection first
    const testDb = require('./test_render_db');
    const dbConnected = await testDb.testRenderBackendConnection();
    
    if (!dbConnected) {
      console.error('❌ Database connection failed, aborting forecast generation');
      process.exit(1);
    }
    
    console.log('\n🎯 Starting 12-month forecast generation...');
    const startTime = Date.now();
    
    // Generate forecasts for 12 months starting from October 2025
    const results = await multi12MonthForecastingService.generateAndSave12MonthForecasts(2025, 10);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 PRODUCTION FORECASTS GENERATED SUCCESSFULLY!');
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log('📊 Results Summary:');
    console.log(`   • Start Month: ${results.startMonth}`);
    console.log(`   • Total Forecasts: ${results.totalForecasts}`);
    console.log(`   • Barangays Covered: ${results.barangaysCount}`);
    console.log(`   • Months Covered: ${results.monthsCovered}`);
    console.log(`   • Previous Forecasts Cleared: ${results.deletedPrevious}`);
    console.log(`   • Generated At: ${results.generatedAt}`);
    
    console.log('\n✅ Production database now has complete forecast coverage!');
    console.log('🔗 API endpoint /api/forecasts/2025/10 should now work');
    
  } catch (error) {
    console.error('❌ PRODUCTION FORECAST GENERATION FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateProductionForecasts();
}

module.exports = generateProductionForecasts;