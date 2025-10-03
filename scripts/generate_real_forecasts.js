const ForecastingService = require('../services/forecastingService');

async function generateRealForecasts() {
  try {
    console.log('🔮 Generating ARIMA forecasts using historical_fires data...');
    
    // Note: We need to simulate the service since it's a class
    const db = require('../db');
    
    // Fetch historical data (same query as in the service)
    console.log('📊 Fetching historical data from historical_fires table...');
    const query = `
      SELECT 
        barangay,
        DATE_TRUNC('month', resolved_at) as month_date,
        COUNT(*) as incident_count
      FROM historical_fires 
      WHERE resolved_at >= NOW() - INTERVAL '15 years'
        AND barangay IS NOT NULL
        AND resolved_at IS NOT NULL
      GROUP BY barangay, DATE_TRUNC('month', resolved_at)
      ORDER BY barangay, month_date
    `;
    
    const result = await db.query(query);
    const historicalData = result.rows.map(row => ({
      barangay: row.barangay,
      date: row.month_date.toISOString().substring(0, 7), // YYYY-MM format
      incident_count: parseInt(row.incident_count)
    }));
    
    console.log(`✅ Found ${historicalData.length} historical data points`);
    
    if (historicalData.length === 0) {
      console.log('❌ No historical data available. Cannot generate forecasts.');
      return;
    }
    
    // Show what barangays we have data for
    const barangays = [...new Set(historicalData.map(d => d.barangay))];
    console.log(`📍 Barangays with historical data: ${barangays.join(', ')}`);
    
    // For now, let's create a sample forecast based on the available data
    // This would normally call the Python ARIMA script
    console.log('\n🎯 This would generate ARIMA forecasts for November 2025...');
    console.log('💡 To run the actual Python ARIMA script, you would need:');
    console.log('   1. Install Python dependencies: pip install pandas numpy statsmodels');
    console.log('   2. Call: python forecasting/arima_forecast.py <data_file> 2025 11');
    
    // Show sample of what the Python script would receive
    console.log('\n📄 Sample data format for Python ARIMA script:');
    console.log(JSON.stringify(historicalData.slice(0, 5), null, 2));
    
  } catch (error) {
    console.error('❌ Error generating forecasts:', error);
  } finally {
    process.exit(0);
  }
}

generateRealForecasts();