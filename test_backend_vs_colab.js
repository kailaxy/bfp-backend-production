/**
 * Test Script: Compare Backend ARIMA with Colab Results
 * Validates that backend produces same predictions as Colab
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const multi12MonthForecastingService = require('./services/multi12MonthForecastingService');

// Helper function to determine risk level from predicted cases
function getRiskLevel(predictedCases) {
  if (predictedCases >= 1) return 'High';
  if (predictedCases >= 0.5) return 'Medium';
  if (predictedCases >= 0.2) return 'Low-Moderate';
  return 'Very Low';
}

async function testBackendVsColab() {
  console.log('🔬 Testing Backend ARIMA Implementation vs Colab Results\n');
  console.log('=' .repeat(80));
  
  // Read actual Colab results from CSV file (October 2025 only)
  const colabResults = {
    'Addition Hills': { predicted: 0.464, model: 'SARIMAX(2,0,1)+(0,1,1,12)' },
    'Bagong Silang': { predicted: 0.103, model: 'SARIMAX(2,0,1)+(0,1,1,12)' },
    'Barangka Drive': { predicted: 0.157, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Barangka Ibaba': { predicted: 0.086, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Barangka Ilaya': { predicted: 0.097, model: 'SARIMAX(2,0,1)+(0,1,1,12)' },
    'Barangka Itaas': { predicted: 0.122, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Buayang Bato': { predicted: 0.050, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Burol': { predicted: 0.000, model: 'SARIMAX(1,0,1)+(1,0,1,12)' },
    'Daang Bakal': { predicted: 0.056, model: 'SARIMAX(1,0,1)+(1,0,1,12)' },
    'Hagdan Bato Itaas': { predicted: 0.000, model: 'SARIMAX(1,0,1)+(1,0,1,12)' },
    'Hagdan Bato Libis': { predicted: 0.091, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Harapin ang Bukas': { predicted: 0.068, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Highway Hills': { predicted: 0.856, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Hulo': { predicted: 0.350, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Mabini J. Rizal': { predicted: 0.071, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Malamig': { predicted: 0.293, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Mauway': { predicted: 0.116, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Namayan': { predicted: 0.046, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'New Zaniga': { predicted: 0.091, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Old Zaniga': { predicted: 0.064, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Pag-asa': { predicted: 0.066, model: 'SARIMAX(1,0,1)+(1,0,1,12)' },
    'Plainview': { predicted: 0.981, model: 'SARIMAX(2,0,1)+(0,1,1,12)' },
    'Pleasant Hills': { predicted: 0.017, model: 'SARIMAX(1,0,1)+(1,0,1,12)' },
    'Poblacion': { predicted: 0.091, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'San Jose': { predicted: 0.116, model: 'SARIMAX(1,1,1)+(1,0,1,12)' },
    'Vergara': { predicted: 0.024, model: 'SARIMAX(2,0,1)+(0,1,1,12)' },
    'Wack-Wack Greenhills': { predicted: 0.447, model: 'SARIMAX(2,0,1)+(0,1,1,12)' }
  };

  try {
    console.log('📊 Generating forecasts for October 2025...\n');
    
    const results = await multi12MonthForecastingService.generate12MonthForecasts(2025, 10);
    
    if (!results || !results.all_forecasts) {
      console.error('❌ No forecast results returned');
      return;
    }

    // Filter October 2025 forecasts
    const oct2025Forecasts = results.all_forecasts.filter(f => 
      f.year === 2025 && f.month === 10
    );

    console.log(`✅ Generated ${oct2025Forecasts.length} forecasts for October 2025\n`);
    console.log('=' .repeat(80));
    console.log('📈 COMPARISON: Backend vs Colab Results');
    console.log('=' .repeat(80));
    console.log();

    // Helper function to normalize barangay names for matching
    const normalizeName = (name) => {
      return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (ñ -> n)
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    // Compare results
    let matchCount = 0;
    let totalTests = 0;
    const tolerance = 0.10; // 10% tolerance for floating point differences

    for (const [barangay, expected] of Object.entries(colabResults)) {
      const normalizedBarangay = normalizeName(barangay);
      const backendResult = oct2025Forecasts.find(f => 
        normalizeName(f.barangay_name) === normalizedBarangay
      );

      if (!backendResult) {
        console.log(`⚠️  ${barangay}`);
        console.log(`   Backend: NOT FOUND`);
        console.log(`   Colab:   ${expected.predicted.toFixed(3)} (${expected.model})`);
        console.log();
        continue;
      }

      totalTests++;
      const backendPredicted = backendResult.predicted_cases;
      const expectedRisk = getRiskLevel(expected.predicted);
      const difference = Math.abs(backendPredicted - expected.predicted);
      const percentDiff = expected.predicted > 0 
        ? (difference / expected.predicted * 100) 
        : (difference > 0.01 ? 100 : 0);
      
      const riskMatch = backendResult.risk_level === expectedRisk;
      const valueMatch = difference <= tolerance;
      
      if (riskMatch && valueMatch) {
        matchCount++;
        console.log(`✅ ${barangay}`);
      } else if (valueMatch) {
        console.log(`🟡 ${barangay} (value match, risk diff)`);
        matchCount += 0.5; // Partial credit
      } else {
        console.log(`❌ ${barangay}`);
      }
      
      console.log(`   Backend: ${backendPredicted.toFixed(3)} → ${backendResult.risk_level}`);
      console.log(`   Colab:   ${expected.predicted.toFixed(3)} → ${expectedRisk}`);
      console.log(`   Model:   ${expected.model}`);
      console.log(`   Diff:    ${difference.toFixed(3)} (${percentDiff.toFixed(1)}%)`);
      
      if (!riskMatch) {
        console.log(`   ⚠️  Risk level mismatch!`);
      }
      if (!valueMatch && difference > tolerance) {
        console.log(`   ⚠️  Value differs by more than tolerance (${tolerance})`);
      }
      console.log();
    }

    console.log('=' .repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(80));
    console.log(`Total barangays tested: ${totalTests}`);
    console.log(`Matching results: ${matchCount}`);
    console.log(`Accuracy: ${((matchCount / totalTests) * 100).toFixed(1)}%`);
    console.log();

    if (matchCount === totalTests) {
      console.log('🎉 SUCCESS! Backend matches Colab implementation perfectly!');
    } else {
      console.log('⚠️  Some differences detected. Check transformation and ARIMA orders.');
    }

    // Show all October 2025 forecasts sorted by predicted cases
    console.log();
    console.log('=' .repeat(80));
    console.log('📋 ALL OCTOBER 2025 FORECASTS (Sorted by Predicted Cases)');
    console.log('=' .repeat(80));
    console.log();

    const sorted = oct2025Forecasts.sort((a, b) => b.predicted_cases - a.predicted_cases);
    
    sorted.forEach((f, i) => {
      const riskEmoji = {
        'High': '🔴',
        'Medium': '🟠',
        'Low-Moderate': '🟡',
        'Very Low': '🟢'
      }[f.risk_level] || '⚪';
      
      console.log(`${(i + 1).toString().padStart(2, ' ')}. ${f.barangay_name.padEnd(25, ' ')} ${riskEmoji} ${f.predicted_cases.toFixed(3)} cases → ${f.risk_level}`);
    });

    console.log();
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test
if (require.main === module) {
  testBackendVsColab().catch(console.error);
}

module.exports = testBackendVsColab;
