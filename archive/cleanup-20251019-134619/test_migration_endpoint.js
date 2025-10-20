// Test script to run migration via API endpoint
// Run this file with: node test_migration_endpoint.js

const API_BASE = process.env.API_BASE || 'https://bfp-backend.onrender.com';

async function runMigration() {
  try {
    // Get your admin token (you'll need to login first or use an existing token)
    const token = process.env.ADMIN_TOKEN;
    
    if (!token) {
      console.log('❌ ADMIN_TOKEN environment variable is required');
      console.log('\nHow to get token:');
      console.log('1. Login to your app as admin');
      console.log('2. Open browser console');
      console.log('3. Run: localStorage.getItem("token")');
      console.log('4. Copy the token');
      console.log('5. Run: ADMIN_TOKEN=your_token_here node test_migration_endpoint.js');
      return;
    }

    console.log('🔍 Checking migration status...');
    
    // Check status first
    const statusRes = await fetch(`${API_BASE}/api/migrations/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const statusData = await statusRes.json();
    console.log('\n📊 Current Status:');
    console.log(JSON.stringify(statusData, null, 2));
    
    if (statusData.migration_status?.ready_for_enhanced_forecasting) {
      console.log('\n✅ Migration already applied! Columns exist.');
      return;
    }
    
    console.log('\n🚀 Running migration...');
    
    // Run migration
    const migrationRes = await fetch(`${API_BASE}/api/migrations/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        migrationName: 'add_model_used_to_forecasts'
      })
    });
    
    const migrationData = await migrationRes.json();
    console.log('\n📋 Migration Result:');
    console.log(JSON.stringify(migrationData, null, 2));
    
    if (migrationData.success) {
      console.log('\n✅ Migration completed successfully!');
      console.log('You can now generate forecasts with SARIMAX/ARIMA model tracking.');
    } else {
      console.log('\n❌ Migration failed:', migrationData.error);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// You can also test by making a simple curl command:
console.log('\n📝 Alternative: Run via curl:');
console.log('\n1. Check status:');
console.log(`curl -H "Authorization: Bearer YOUR_TOKEN" ${API_BASE}/api/migrations/status`);
console.log('\n2. Run migration:');
console.log(`curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" -d '{"migrationName":"add_model_used_to_forecasts"}' ${API_BASE}/api/migrations/run`);
console.log('\n');

if (process.env.ADMIN_TOKEN) {
  runMigration();
}
