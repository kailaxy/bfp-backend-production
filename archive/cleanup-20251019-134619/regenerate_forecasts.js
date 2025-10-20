require('dotenv').config();

async function regenerateForecasts() {
  try {
    console.log('🔄 Triggering forecast regeneration on Railway...\n');
    
    // Get Railway URL from environment or use default
    const BACKEND_URL = process.env.RAILWAY_URL || 'https://bfp-backend-production.up.railway.app';
    const API_URL = `${BACKEND_URL}/api/forecasts/generate-12-months`;
    
    console.log(`📡 Calling: ${API_URL}`);
    
    // You'll need an admin token - check .env for ADMIN_TOKEN
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.TEST_TOKEN;
    
    if (!ADMIN_TOKEN) {
      console.error('❌ ADMIN_TOKEN not found in .env');
      console.log('Please set ADMIN_TOKEN=<your-admin-jwt-token> in .env');
      process.exit(1);
    }
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        startYear: 2025,
        startMonth: 10
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log(data);
    } else {
      console.error('❌ Failed:', data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

regenerateForecasts();
