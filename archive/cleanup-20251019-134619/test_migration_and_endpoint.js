/**
 * Test Script: Migration + Graph Endpoint Testing
 * 
 * This script:
 * 1. Executes the forecasts_graphs table migration
 * 2. Generates forecasts to populate graph data
 * 3. Tests the GET /api/forecasts/graphs/:barangay endpoint
 * 
 * Usage:
 *   node test_migration_and_endpoint.js
 * 
 * Requirements:
 *   - Admin JWT token set in environment or hardcoded below
 *   - Railway backend deployed and accessible
 */

const BASE_URL = 'https://bfp-backend-production.up.railway.app';

// TODO: Replace with your actual admin JWT token
const ADMIN_TOKEN = process.env.ADMIN_JWT_TOKEN || 'YOUR_ADMIN_TOKEN_HERE';

// Test barangay for graph data retrieval
const TEST_BARANGAY = 'Addition Hills';

/**
 * Step 1: Execute Migration
 */
async function executeMigration() {
  console.log('\n📊 Step 1: Executing forecasts_graphs table migration...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/forecasts/migrate-graph-table`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Migration successful!');
      console.log('📋 Table structure:', JSON.stringify(data.table_structure, null, 2));
      return true;
    } else {
      console.error('❌ Migration failed:', data);
      
      // Check if table already exists
      if (data.error && data.error.includes('already exists')) {
        console.log('ℹ️  Table already exists - continuing...');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ Migration request failed:', error.message);
    return false;
  }
}

/**
 * Step 2: Generate Forecasts (Optional - can be skipped if already generated)
 */
async function generateForecasts() {
  console.log('\n🔮 Step 2: Generating forecasts (this may take 10-15 minutes)...\n');
  console.log('⚠️  This step is optional - skip if forecasts were recently generated.\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question('Generate forecasts now? (y/n): ', async (answer) => {
      readline.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('⏭️  Skipping forecast generation.');
        resolve(true);
        return;
      }
      
      try {
        console.log('⏳ Generating forecasts...');
        
        const response = await fetch(`${BASE_URL}/api/forecasts/generate-enhanced`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          console.log('✅ Forecasts generated successfully!');
          console.log('📊 Statistics:');
          console.log('   - Barangays processed:', data.metadata?.barangays_processed);
          console.log('   - Forecasts generated:', data.metadata?.forecasts_generated);
          console.log('   - Graph records stored:', data.metadata?.graph_records_stored);
          resolve(true);
        } else {
          console.error('❌ Forecast generation failed:', data);
          resolve(false);
        }
      } catch (error) {
        console.error('❌ Forecast generation request failed:', error.message);
        resolve(false);
      }
    });
  });
}

/**
 * Step 3: Test GET Endpoint
 */
async function testGraphEndpoint() {
  console.log(`\n📈 Step 3: Testing GET /api/forecasts/graphs/${TEST_BARANGAY}...\n`);
  
  try {
    const encodedBarangay = encodeURIComponent(TEST_BARANGAY);
    const response = await fetch(`${BASE_URL}/api/forecasts/graphs/${encodedBarangay}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Graph endpoint working!');
      console.log('\n📊 Metadata:');
      console.log('   - Barangay:', data.barangay);
      console.log('   - Total records:', data.metadata.total_records);
      console.log('   - Date range:', data.metadata.date_range.start, 'to', data.metadata.date_range.end);
      console.log('\n📈 Dataset counts:');
      console.log('   - Actual:', data.metadata.datasets.actual);
      console.log('   - Fitted:', data.metadata.datasets.fitted);
      console.log('   - Forecast:', data.metadata.datasets.forecast);
      console.log('   - CI Lower:', data.metadata.datasets.ci_lower);
      console.log('   - CI Upper:', data.metadata.datasets.ci_upper);
      console.log('   - Moving Avg:', data.metadata.datasets.moving_avg_6);
      
      console.log('\n📋 Sample data points (first 3):');
      console.log('   Actual:', JSON.stringify(data.data.actual.slice(0, 3), null, 2));
      console.log('   Forecast:', JSON.stringify(data.data.forecast.slice(0, 3), null, 2));
      
      return true;
    } else {
      console.error('❌ Graph endpoint failed:', data);
      
      if (response.status === 404) {
        console.log('\nℹ️  No graph data found. Did you generate forecasts?');
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ Graph endpoint request failed:', error.message);
    return false;
  }
}

/**
 * Main execution flow
 */
async function main() {
  console.log('🚀 Starting Migration & Endpoint Test...');
  console.log('🔗 Backend URL:', BASE_URL);
  console.log('🔐 Using admin token:', ADMIN_TOKEN.substring(0, 20) + '...');
  
  // Validate token is set
  if (ADMIN_TOKEN === 'YOUR_ADMIN_TOKEN_HERE') {
    console.error('\n❌ Error: Please set ADMIN_JWT_TOKEN environment variable or update the script.');
    console.log('\nOptions:');
    console.log('1. Set environment variable: $env:ADMIN_JWT_TOKEN="your_token_here"');
    console.log('2. Edit test_migration_and_endpoint.js and replace YOUR_ADMIN_TOKEN_HERE');
    process.exit(1);
  }
  
  // Step 1: Migration
  const migrationSuccess = await executeMigration();
  if (!migrationSuccess) {
    console.error('\n❌ Migration failed. Stopping.');
    process.exit(1);
  }
  
  // Step 2: Generate Forecasts (optional)
  await generateForecasts();
  
  // Step 3: Test Endpoint
  const endpointSuccess = await testGraphEndpoint();
  
  if (endpointSuccess) {
    console.log('\n🎉 All tests passed! Ready for Phase 4 (Frontend).');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { executeMigration, generateForecasts, testGraphEndpoint };
