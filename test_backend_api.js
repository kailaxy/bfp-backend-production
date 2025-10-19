const http = require('http');

console.log('🧪 Testing Backend API Endpoints...\n');
console.log('═'.repeat(80));

const baseUrl = 'http://localhost:5000';

async function testEndpoint(name, path) {
  return new Promise((resolve) => {
    const url = `${baseUrl}${path}`;
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`   URL: ${path}`);
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log(`   ✅ Status: ${res.statusCode}`);
            
            // Show summary based on endpoint
            if (json.features) {
              console.log(`   📊 Result: ${json.features.length} features`);
            } else if (json.barangays) {
              console.log(`   📊 Result: ${json.barangays.length} barangays`);
            } else if (Array.isArray(json)) {
              console.log(`   📊 Result: ${json.length} items`);
            } else if (json.rows) {
              console.log(`   📊 Result: ${json.rows.length} rows`);
            } else {
              console.log(`   📊 Result: ${JSON.stringify(json).substring(0, 100)}...`);
            }
            resolve(true);
          } else {
            console.log(`   ⚠️  Status: ${res.statusCode}`);
            console.log(`   Response: ${data.substring(0, 200)}`);
            resolve(false);
          }
        } catch (error) {
          console.log(`   ❌ Error parsing JSON: ${error.message}`);
          console.log(`   Raw response: ${data.substring(0, 200)}`);
          resolve(false);
        }
      });
    }).on('error', (error) => {
      console.log(`   ❌ Connection error: ${error.message}`);
      resolve(false);
    });
  });
}

async function runTests() {
  const tests = [
    { name: 'Health Check', path: '/health' },
    { name: 'Barangays (GeoJSON)', path: '/api/barangays' },
    { name: 'Forecasts (Current)', path: '/api/forecasts' },
    { name: 'Fire Stations', path: '/api/fire-stations' },
    { name: 'Hydrants', path: '/api/hydrants' },
    { name: 'Historical Fires', path: '/api/historical-fires' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.path);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between tests
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 TEST RESULTS:\n');
  console.log(`   ✅ Passed: ${passed}/${tests.length}`);
  console.log(`   ❌ Failed: ${failed}/${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Backend is fully operational with Render database!');
    console.log('\n💡 Next steps:');
    console.log('   1. Update Railway environment variables with new DATABASE_URL');
    console.log('   2. Deploy backend to Railway');
    console.log('   3. Test frontend connection');
    console.log('   4. Verify map displays correctly with barangay boundaries');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
  
  console.log('═'.repeat(80));
  process.exit(0);
}

// Wait 2 seconds for server to fully start
setTimeout(runTests, 2000);
