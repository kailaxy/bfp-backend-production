// Script to fix the active_fires table id column
const axios = require('axios');

const RENDER_URL = 'https://bfp-backend-latest.onrender.com';

async function fixActiveFiresTable() {
  try {
    console.log('🔧 Calling active_fires table fix endpoint...');
    
    const response = await axios.post(`${RENDER_URL}/api/fix-active-fires-table`);
    
    console.log('✅ Success!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error calling fix endpoint:', error.response?.data || error.message);
  }
}

fixActiveFiresTable();