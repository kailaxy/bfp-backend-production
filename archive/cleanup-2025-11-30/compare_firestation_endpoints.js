// Script to fetch fire stations from both endpoints and compare
const fetch = require('node-fetch');

const API_BASE = 'https://bfp-backend-production.up.railway.app';
// const API_BASE = 'http://localhost:3000'; // Use this if testing locally

async function compareEndpoints() {
  try {
    console.log('🔍 Comparing fire station endpoints...\n');
    
    // Fetch from public endpoint (used by map)
    console.log('📡 Fetching from public endpoint: GET /api/firestation');
    const publicResponse = await fetch(`${API_BASE}/api/firestation`);
    const publicData = await publicResponse.json();
    
    console.log(`✅ Public endpoint returned ${publicData.features?.length || 0} stations\n`);
    
    if (publicData.features && publicData.features.length > 0) {
      console.log('📍 Public endpoint stations:');
      publicData.features.forEach((f, i) => {
        console.log(`   ${i+1}. ID ${f.properties.id}: ${f.properties.name}`);
      });
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Note: Admin endpoint requires authentication
    console.log('⚠️  To check the admin endpoint, you need to:');
    console.log('   1. Log in to the admin panel');
    console.log('   2. Go to Fire Stations Manager');
    console.log('   3. Check how many stations are listed there');
    console.log('   4. Compare with the map');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

compareEndpoints();
