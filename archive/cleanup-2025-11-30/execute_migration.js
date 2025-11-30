/**
 * Quick Migration Executor
 * 
 * This script will:
 * 1. Ask for your admin credentials
 * 2. Get a JWT token
 * 3. Execute the migration
 * 4. Test the endpoint
 */

const readline = require('readline');

const BASE_URL = 'https://bfp-backend-production.up.railway.app';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Get admin JWT token by logging in
 */
async function getAdminToken() {
  console.log('\n🔐 Step 1: Getting admin JWT token...\n');
  
  const email = await question('Enter admin email: ');
  const password = await question('Enter admin password: ');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      console.log('✅ Login successful!');
      console.log('👤 User:', data.user?.email);
      console.log('🔑 Token obtained\n');
      return data.token;
    } else {
      console.error('❌ Login failed:', data.error || data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Login request failed:', error.message);
    return null;
  }
}

/**
 * Execute migration
 */
async function executeMigration(token) {
  console.log('\n📊 Step 2: Executing forecasts_graphs table migration...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/forecasts/migrate-graph-table`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Migration successful!');
      console.log('📋 Message:', data.message);
      console.log('\n📊 Table Structure:');
      data.table_structure?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
      console.log('');
      return true;
    } else {
      console.error('❌ Migration failed:', data);
      
      // Check if table already exists
      if (data.error && data.error.includes('already exists')) {
        console.log('ℹ️  Table already exists - this is OK!');
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
 * Test GET endpoint
 */
async function testGraphEndpoint(token) {
  console.log('\n📈 Step 3: Testing GET endpoint (optional)...\n');
  
  const shouldTest = await question('Test GET endpoint now? (y/n): ');
  
  if (shouldTest.toLowerCase() !== 'y') {
    console.log('⏭️  Skipping endpoint test.');
    return;
  }
  
  const barangay = await question('Enter barangay name (or press Enter for "Addition Hills"): ') || 'Addition Hills';
  
  try {
    const encodedBarangay = encodeURIComponent(barangay);
    const response = await fetch(`${BASE_URL}/api/forecasts/graphs/${encodedBarangay}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('\n✅ Graph endpoint working!');
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
    } else {
      console.error('\n❌ Graph endpoint failed:', data);
      
      if (response.status === 404) {
        console.log('\nℹ️  No graph data found. You need to generate forecasts first.');
        console.log('   Go to Admin Panel → Forecasts → "Generate/Regenerate" button');
      }
    }
  } catch (error) {
    console.error('❌ Graph endpoint request failed:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 BFP Migration Executor\n');
  console.log('This script will:');
  console.log('1. Log you in as admin');
  console.log('2. Execute the forecasts_graphs table migration');
  console.log('3. (Optional) Test the GET endpoint\n');
  
  const continueExec = await question('Continue? (y/n): ');
  
  if (continueExec.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    rl.close();
    return;
  }
  
  // Step 1: Get admin token
  const token = await getAdminToken();
  
  if (!token) {
    console.error('\n❌ Could not get admin token. Exiting.');
    rl.close();
    return;
  }
  
  // Step 2: Execute migration
  const migrationSuccess = await executeMigration(token);
  
  if (!migrationSuccess) {
    console.error('\n❌ Migration failed. Exiting.');
    rl.close();
    return;
  }
  
  // Step 3: Test endpoint (optional)
  await testGraphEndpoint(token);
  
  console.log('\n🎉 Migration complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Generate forecasts: Admin Panel → Forecasts → "Generate/Regenerate"');
  console.log('2. Wait 10-15 minutes for generation to complete');
  console.log('3. Click "View Graph" on any barangay to see visualization');
  console.log('');
  
  rl.close();
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
