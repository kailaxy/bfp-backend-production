// Fix Zaniga encoding - replace ñ with n in barangay names
async function fixZanigaEncoding() {
  console.log('🔧 Fixing Zaniga encoding in database...');
  
  try {
    // Add a temporary endpoint to fix the encoding
    const fetch = require('node-fetch');
    
    // First, let's create a fix endpoint
    const fixEndpointCode = `
// Add this temporary endpoint to fix Zaniga encoding
app.post('/api/fix-zaniga-encoding', async (req, res) => {
  try {
    const db = require('./config/db');
    
    console.log('🔧 Starting Zaniga encoding fix...');
    
    // Update Old Zañiga to Old Zaniga
    const result1 = await db.query(
      "UPDATE forecasts SET barangay_name = 'Old Zaniga' WHERE barangay_name LIKE '%Za_iga%' AND barangay_name LIKE 'Old%'"
    );
    
    // Update New Zañiga to New Zaniga  
    const result2 = await db.query(
      "UPDATE forecasts SET barangay_name = 'New Zaniga' WHERE barangay_name LIKE '%Za_iga%' AND barangay_name LIKE 'New%'"
    );
    
    // Check what we found
    const check = await db.query(
      "SELECT DISTINCT barangay_name FROM forecasts WHERE barangay_name LIKE '%Zaniga%' ORDER BY barangay_name"
    );
    
    console.log('✅ Zaniga encoding fixed');
    console.log('📊 Old Zaniga records updated:', result1.rowCount);
    console.log('📊 New Zaniga records updated:', result2.rowCount);
    console.log('📋 Current Zaniga entries:', check.rows.map(r => r.barangay_name));
    
    res.json({
      success: true,
      old_zaniga_updated: result1.rowCount,
      new_zaniga_updated: result2.rowCount,
      current_zaniga_names: check.rows.map(r => r.barangay_name)
    });
    
  } catch (error) {
    console.error('❌ Zaniga fix error:', error);
    res.status(500).json({ error: 'Fix failed: ' + error.message });
  }
});
console.log('🔧 Temporary Zaniga fix endpoint added: POST /api/fix-zaniga-encoding');
`;
    
    console.log('📝 Fix endpoint code prepared');
    console.log('⚠️  You need to add this endpoint to server.js temporarily, then deploy and call it');
    
    return fixEndpointCode;
    
  } catch (error) {
    console.error('❌ Fix preparation failed:', error);
    throw error;
  }
}

// Export the fix code
module.exports = { fixZanigaEncoding };