// Convert ARIMA output to database format and upload to Render
const fs = require('fs');

async function convertAndUpload() {
  try {
    console.log('📊 Converting ARIMA forecasts for database upload...');
    
    // Read the ARIMA output
    const rawData = JSON.parse(fs.readFileSync('upload_payload.json', 'utf8'));
    console.log('📖 Read', rawData.forecasts.length, 'forecast records');
    
    // Convert to database format matching forecasts table schema
    const dbForecasts = rawData.forecasts.map(forecast => ({
      barangay_name: forecast.barangay_name,
      month: forecast.month,
      year: forecast.year,
      predicted_cases: Math.round(forecast.predicted_cases * 100) / 100, // Round to 2 decimal places
      lower_bound: forecast.lower_bound || 0,
      upper_bound: forecast.upper_bound || forecast.predicted_cases * 3,
      risk_level: forecast.risk_level,
      risk_flag: forecast.risk_flag === 'Elevated Risk'
    }));
    
    console.log('🔄 Converted to database format, uploading via API...');
    console.log('🎯 Sample record:', dbForecasts[0]);
    
    // Upload to Render via API
    const fetch = require('node-fetch');
    const response = await fetch('https://bfp-backend.onrender.com/api/upload-arima-forecasts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ forecasts: dbForecasts })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Upload successful!');
    console.log('📊 Result:', result);
    
    // Save success log
    fs.writeFileSync('upload_success.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      records_uploaded: dbForecasts.length,
      server_response: result
    }, null, 2));
    
    console.log('🎉 ARIMA forecasts successfully uploaded to Render database!');
    console.log(`📈 ${result.total_in_database} total forecasts now in database`);
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    
    // Save error log
    fs.writeFileSync('upload_error.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    }, null, 2));
    
    throw error;
  }
}

// Run the conversion and upload
convertAndUpload();