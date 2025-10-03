const pool = require('../config/db');

async function runDataQualityCleanup() {
  try {
    console.log('🧹 Starting data quality cleanup...');
    console.log('✅ Connected to PostgreSQL');
    
    let totalFixed = 0;
    
    // 1. Fix barangay name standardization
    console.log('\n1️⃣ Standardizing barangay names...');
    
    const barangayFixes = [
      { from: 'Wack-wack Greenhills', to: 'Wack Wack Greenhills' },
      { from: 'New Zaniga', to: 'New Zanigas' },
      { from: 'Old Zaniga', to: 'Old Zanigas' },
      { from: 'Hagdan Bato Itaas', to: 'Hagdang Bato Itaas' },
      { from: 'Hagdan Bato Libis', to: 'Hagdang Bato Libis' },
    ];
    
    for (const fix of barangayFixes) {
      const result = await pool.query(
        'UPDATE historical_fires SET barangay = $1 WHERE barangay = $2',
        [fix.to, fix.from]
      );
      if (result.rowCount > 0) {
        console.log(`   ✅ Updated ${result.rowCount} records: "${fix.from}" → "${fix.to}"`);
        totalFixed += result.rowCount;
      }
    }
    
    // 2. Fix NULL or empty barangays by re-extracting from address
    console.log('\n2️⃣ Fixing NULL/empty barangays...');
    
    const nullBarangayRecords = await pool.query(`
      SELECT id, address 
      FROM historical_fires 
      WHERE barangay IS NULL OR barangay = '' OR barangay = 'Unknown'
      LIMIT 50
    `);
    
    let barangayFixed = 0;
    for (const record of nullBarangayRecords.rows) {
      const extractedBarangay = extractBarangayFromLocation(record.address);
      if (extractedBarangay && extractedBarangay !== 'Unknown') {
        await pool.query(
          'UPDATE historical_fires SET barangay = $1 WHERE id = $2',
          [extractedBarangay, record.id]
        );
        barangayFixed++;
      }
    }
    
    if (barangayFixed > 0) {
      console.log(`   ✅ Fixed ${barangayFixed} records with missing barangays`);
      totalFixed += barangayFixed;
    }
    
    // 3. Fix damage amounts (ensure no negative values and handle nulls)
    console.log('\n3️⃣ Cleaning damage amounts...');
    
    const damageCleanResult = await pool.query(`
      UPDATE historical_fires 
      SET estimated_damage = CASE 
        WHEN estimated_damage IS NULL THEN 0
        WHEN estimated_damage < 0 THEN 0
        ELSE estimated_damage
      END
      WHERE estimated_damage IS NULL OR estimated_damage < 0
    `);
    
    if (damageCleanResult.rowCount > 0) {
      console.log(`   ✅ Cleaned ${damageCleanResult.rowCount} damage amount records`);
      totalFixed += damageCleanResult.rowCount;
    }
    
    // 4. Fix casualty and injury counts (they're already integers, just ensure no nulls)
    console.log('\n4️⃣ Cleaning casualty and injury counts...');
    
    const casualtyCleanResult = await pool.query(`
      UPDATE historical_fires 
      SET casualties = COALESCE(casualties, 0),
          injuries = COALESCE(injuries, 0)
      WHERE casualties IS NULL OR injuries IS NULL
    `);
    
    if (casualtyCleanResult.rowCount > 0) {
      console.log(`   ✅ Cleaned ${casualtyCleanResult.rowCount} casualty/injury records`);
      totalFixed += casualtyCleanResult.rowCount;
    }
    
    // 5. Remove duplicate records (same date, address, and damage)
    console.log('\n5️⃣ Removing duplicate records...');
    
    const duplicateRemoveResult = await pool.query(`
      DELETE FROM historical_fires 
      WHERE id IN (
        SELECT id FROM (
          SELECT id, 
                 ROW_NUMBER() OVER (
                   PARTITION BY reported_at, address, estimated_damage 
                   ORDER BY id
                 ) as rn
          FROM historical_fires
        ) t 
        WHERE t.rn > 1
      )
    `);
    
    if (duplicateRemoveResult.rowCount > 0) {
      console.log(`   ✅ Removed ${duplicateRemoveResult.rowCount} duplicate records`);
    }
    
    // 6. Generate final statistics
    console.log('\n📊 Final Data Quality Report:');
    
    const finalStats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT barangay) as unique_barangays,
        COUNT(*) FILTER (WHERE barangay IS NULL OR barangay = '' OR barangay = 'Unknown') as missing_barangays,
        COUNT(*) FILTER (WHERE estimated_damage > 0) as records_with_damage,
        SUM(estimated_damage) as total_damage,
        COUNT(*) FILTER (WHERE casualties > 0) as records_with_casualties,
        COUNT(*) FILTER (WHERE injuries > 0) as records_with_injuries
      FROM historical_fires
    `);
    
    const stats = finalStats.rows[0];
    console.table([{
      'Total Records': stats.total_records,
      'Unique Barangays': stats.unique_barangays,
      'Missing Barangays': stats.missing_barangays,
      'Records w/ Damage': stats.records_with_damage,
      'Total Damage': `₱${Number(stats.total_damage).toLocaleString()}`,
      'Records w/ Casualties': stats.records_with_casualties,
      'Records w/ Injuries': stats.records_with_injuries
    }]);
    
    console.log(`\n✅ Data quality cleanup completed!`);
    console.log(`🔧 Total records fixed: ${totalFixed}`);
    console.log(`📈 Data quality improved and ready for ARIMA forecasting`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Helper function to extract barangay from location string
function extractBarangayFromLocation(location) {
  if (!location) return null;
  
  // Common patterns to extract barangay
  const patterns = [
    /brgy\.?\s+([^,]+)/i,
    /barangay\s+([^,]+)/i,
    /\b([A-Za-z\s]+),\s*manda/i,
    /\b([A-Za-z\s]+)\s*,.*mandaluyong/i
  ];
  
  for (const pattern of patterns) {
    const match = location.match(pattern);
    if (match) {
      let barangay = match[1].trim();
      
      // Clean up common variations
      barangay = barangay
        .replace(/\bmanda\.?\s*city\b/i, '')
        .replace(/\bmandaluyong\b/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Known barangay mappings
      const knownBarangays = {
        'addition hills': 'Addition Hills',
        'bagong silang': 'Bagong Silang',
        'barangka drive': 'Barangka Drive',
        'barangka ibaba': 'Barangka Ibaba',
        'barangka ilaya': 'Barangka Ilaya',
        'barangka itaas': 'Barangka Itaas',
        'buayang bato': 'Buayang Bato',
        'burol': 'Burol',
        'daang bakal': 'Daang Bakal',
        'hagdan bato itaas': 'Hagdang Bato Itaas',
        'hagdan bato libis': 'Hagdang Bato Libis',
        'harapin ang bukas': 'Harapin ang Bukas',
        'highway hills': 'Highway Hills',
        'hulo': 'Hulo',
        'mabini j. rizal': 'Mabini J. Rizal',
        'malamig': 'Malamig',
        'mauway': 'Mauway',
        'namayan': 'Namayan',
        'new zaniga': 'New Zanigas',
        'old zaniga': 'Old Zanigas',
        'pag-asa': 'Pag-asa',
        'plainview': 'Plainview',
        'pleasant hills': 'Pleasant Hills',
        'poblacion': 'Poblacion',
        'san jose': 'San Jose',
        'vergara': 'Vergara',
        'wack wack': 'Wack Wack Greenhills',
        'wack-wack': 'Wack Wack Greenhills'
      };
      
      const normalized = barangay.toLowerCase();
      if (knownBarangays[normalized]) {
        return knownBarangays[normalized];
      }
      
      if (barangay.length > 2 && barangay.length < 50) {
        return barangay;
      }
    }
  }
  
  return null;
}

// Run the cleanup
runDataQualityCleanup().catch(console.error);