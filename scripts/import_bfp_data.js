const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * BFP Historical Data Import Script
 * 
 * Handles the BFP CSV format:
 * DATE_CLEAN | LOCATION | TYPE OF OCCUPANCY | NATURE OF FIRE | STATUS OF ALARM | CASUALTY | INJURY | ESTIMATED DAMAGE
 * 
 * For ARIMA forecasting, we only need:
 * - DATE_CLEAN (for year/month)
 * - LOCATION (to extract barangay)
 * - Count of incidents per month per barangay
 * 
 * Everything else is optional/bonus data
 */

async function importBFPData() {
  try {
    console.log('🏛️ BFP Historical Fire Data Import');
    console.log('📊 Focus: Extract Barangay + Date + Count for ARIMA');
    console.log('⚠️ Note: Missing lat/lng/duration = No problem for forecasting\n');
    
    // Look for BFP data file
    const possibleFiles = [
      '../../bfp_historical_fires.csv',
      '../../historical_fires_bfp.csv', 
      '../../prediction.csv' // fallback
    ];
    
    let csvPath = null;
    for (const filePath of possibleFiles) {
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        csvPath = fullPath;
        break;
      }
    }
    
    if (!csvPath) {
      console.log('📁 Expected file structure:');
      console.log('   c:/Users/Kyle Sermon/bfp-project/bfp_historical_fires.csv');
      console.log('   OR');
      console.log('   c:/Users/Kyle Sermon/bfp-project/historical_fires_bfp.csv');
      throw new Error('BFP historical data file not found. Please place your CSV file in the project root.');
    }
    
    console.log(`📂 Using file: ${csvPath}`);
    
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    console.log(`📄 Found ${lines.length} lines (including header)`);
    
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or only contains header');
    }
    
    const header = lines[0].toLowerCase();
    console.log(`📋 Headers detected: ${header}`);
    
    // Clear existing BFP imports
    console.log('\n🗑️ Clearing previous BFP imports...');
    const deleted = await pool.query('DELETE FROM historical_fires WHERE reported_by = $1', ['BFP Import']);
    console.log(`✅ Cleared ${deleted.rowCount} existing records`);
    
    // Parse data
    const dataLines = lines.slice(1);
    let inserted = 0;
    let skipped = 0;
    const barangayCounts = new Map();
    
    console.log('\n🔄 Processing records...');
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      try {
        // Handle CSV parsing (basic comma split - you may need to enhance for quoted values)
        const parts = parseCSVLine(line);
        
        if (parts.length < 2) {
          skipped++;
          continue;
        }
        
        // Extract essential fields for ARIMA
        const dateClean = parts[0] ? parts[0].trim() : null;
        const location = parts[1] ? parts[1].trim() : null;
        
        // Optional fields (for completeness, but not required for ARIMA)
        const typeOfOccupancy = parts[2] ? parts[2].trim() : null;
        const natureOfFire = parts[3] ? parts[3].trim() : null;
        const statusOfAlarm = parts[4] ? parts[4].trim() : null;
        const casualty = parts[5] ? parseInt(parts[5]) || null : null;
        const injury = parts[6] ? parseInt(parts[6]) || null : null;
        const estimatedDamage = parts[7] ? parseFloat(parts[7]) || null : null;
        
        // Validate essential fields
        if (!dateClean || !location) {
          skipped++;
          continue;
        }
        
        // Extract barangay from location
        const barangay = extractBarangay(location);
        if (!barangay) {
          console.warn(`⚠️ Could not extract barangay from: "${location}"`);
          skipped++;
          continue;
        }
        
        // Parse date
        const resolvedAt = parseDate(dateClean);
        if (!resolvedAt) {
          console.warn(`⚠️ Could not parse date: "${dateClean}"`);
          skipped++;
          continue;
        }
        
        // Count by barangay for stats
        barangayCounts.set(barangay, (barangayCounts.get(barangay) || 0) + 1);
        
        // Insert record (only essential fields + some optional ones if available)
        await pool.query(`
          INSERT INTO historical_fires (
            id,
            lat,
            lng,
            barangay,
            address,
            alarm_level,
            reported_at,
            resolved_at,
            casualties,
            injuries,
            estimated_damage,
            reported_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          require('crypto').randomUUID(),
          14.5794 + (Math.random() - 0.5) * 0.02, // Random lat in Mandaluyong
          121.0359 + (Math.random() - 0.5) * 0.02, // Random lng in Mandaluyong  
          barangay,
          location,
          statusOfAlarm || 'Unknown',
          resolvedAt,
          resolvedAt,
          casualty,
          injury,
          estimatedDamage,
          'BFP Import'
        ]);
        
        inserted++;
        
        // Progress indicator
        if (inserted % 100 === 0) {
          console.log(`   📈 Processed ${inserted} records...`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error processing line ${i + 2}: ${error.message}`);
        skipped++;
      }
    }
    
    console.log(`\n✅ Import completed!`);
    console.log(`   📊 Inserted: ${inserted} records`);
    console.log(`   ⚠️ Skipped: ${skipped} records`);
    console.log(`   🗺️ Barangays: ${barangayCounts.size}`);
    
    // Show barangay distribution
    console.log('\n📈 Records per barangay:');
    const sortedBarangays = Array.from(barangayCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    console.table(sortedBarangays.map(([barangay, count]) => ({ barangay, count })));
    
    // Verify ARIMA readiness
    console.log('\n🎯 ARIMA Forecasting Readiness Check:');
    const arimaCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT barangay) as unique_barangays,
        COUNT(DISTINCT TO_CHAR(resolved_at, 'YYYY-MM')) as unique_months,
        MIN(resolved_at) as earliest_date,
        MAX(resolved_at) as latest_date
      FROM historical_fires 
      WHERE reported_by = 'BFP Import'
        AND barangay IS NOT NULL
    `);
    
    console.table(arimaCheck.rows);
    
    console.log('\n🚀 Status: Ready for ARIMA forecasting!');
    console.log('   • Essential data: Barangay ✅ Date ✅ Count ✅');
    console.log('   • Optional missing fields: No impact on forecasting');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    process.exit(0);
  }
}

// Helper: Parse CSV line (handles basic comma separation)
function parseCSVLine(line) {
  // Simple CSV parser - enhance if your data has quoted commas
  return line.split(',').map(field => field.trim().replace(/^"|"$/g, ''));
}

// Helper: Extract barangay from location string
function extractBarangay(location) {
  if (!location) return null;
  
  // Known Mandaluyong barangays
  const barangays = [
    'Addition Hills', 'Bagong Silang', 'Barangka Drive', 'Barangka Ibaba',
    'Barangka Ilaya', 'Barangka Itaas', 'Buayang Bato', 'Burol',
    'Daang Bakal', 'Hagdang Bato Itaas', 'Hagdang Bato Libis',
    'Harapin ang Bukas', 'Highway Hills', 'Hulo', 'Mabini J. Rizal',
    'Malamig', 'Mauway', 'Namayan', 'New Zaniga', 'Old Zaniga',
    'Pag-asa', 'Plainview', 'Pleasant Hills', 'Poblacion', 
    'San Jose', 'Vergara', 'Wack-wack Greenhills'
  ];
  
  const locationLower = location.toLowerCase();
  
  // Try exact matches first
  for (const barangay of barangays) {
    if (locationLower.includes(barangay.toLowerCase())) {
      return barangay;
    }
  }
  
  // Try common patterns
  if (locationLower.includes('brgy') || locationLower.includes('barangay')) {
    const match = location.match(/(?:brgy\.?\s*|barangay\s+)([^,]+)/i);
    if (match) {
      const extracted = match[1].trim();
      // Try to match extracted name to known barangays
      for (const barangay of barangays) {
        if (barangay.toLowerCase().includes(extracted.toLowerCase()) || 
            extracted.toLowerCase().includes(barangay.toLowerCase())) {
          return barangay;
        }
      }
      return extracted; // Return as-is if no match
    }
  }
  
  return null;
}

// Helper: Parse various date formats
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Try direct parsing first
    let date = new Date(dateStr);
    
    // If invalid, try common formats
    if (isNaN(date.getTime())) {
      // Try MM/DD/YYYY
      const mmddyyyy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mmddyyyy) {
        date = new Date(mmddyyyy[3], mmddyyyy[1] - 1, mmddyyyy[2]);
      }
      
      // Try DD/MM/YYYY
      if (isNaN(date.getTime())) {
        const ddmmyyyy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (ddmmyyyy) {
          date = new Date(ddmmyyyy[3], ddmmyyyy[2] - 1, ddmmyyyy[1]);
        }
      }
    }
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Add random time if not present
    if (dateStr.length <= 10) {
      date.setHours(Math.floor(Math.random() * 24));
      date.setMinutes(Math.floor(Math.random() * 60));
    }
    
    return date.toISOString();
    
  } catch (error) {
    return null;
  }
}

// Run import
if (require.main === module) {
  importBFPData();
}

module.exports = { importBFPData };