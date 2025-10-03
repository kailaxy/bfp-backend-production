const { pool } = require('../config/db');

async function cleanupDataQualityIssues() {
  console.log('🧹 Starting data quality cleanup...');
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // 1. Fix barangay names - standardize common variations
    console.log('\n1️⃣ Standardizing barangay names...');
    
    const barangayUpdates = [
      // Fix common spelling variations and standardize names
      { from: 'Addition Hills', to: 'Addition Hills' }, // Already correct
      { from: 'Barangka Drive', to: 'Barangka Drive' }, // Already correct
      { from: 'Barangka Ibaba', to: 'Barangka Ibaba' }, // Already correct
      { from: 'Barangka Ilaya', to: 'Barangka Ilaya' }, // Already correct
      { from: 'Barangka Itaas', to: 'Barangka Itaas' }, // Already correct
      { from: 'Highway Hills', to: 'Highway Hills' }, // Already correct
      { from: 'Wack-wack Greenhills', to: 'Wack Wack Greenhills' }, // Standardize hyphen
      { from: 'New Zaniga', to: 'New Zanigas' }, // Correct name
      { from: 'Old Zaniga', to: 'Old Zanigas' }, // Correct name
    ];
    
    for (const update of barangayUpdates) {
      if (update.from !== update.to) {
        const result = await client.query(
          'UPDATE historical_fires SET barangay = $1 WHERE barangay = $2',
          [update.to, update.from]
        );
        if (result.rowCount > 0) {
          console.log(`   ✅ Updated ${result.rowCount} records: "${update.from}" → "${update.to}"`);
        }
      }
    }
    
    // 2. Handle records with 'Unknown' barangay - try to re-extract from location
    console.log('\n2️⃣ Attempting to fix "Unknown" barangay records...');
    
    const unknownBarangayRecords = await client.query(
      'SELECT id, location FROM historical_fires WHERE barangay = $1 OR barangay IS NULL',
      ['Unknown']
    );
    
    console.log(`   Found ${unknownBarangayRecords.rows.length} records with unknown barangay`);
    
    let fixedUnknown = 0;
    for (const record of unknownBarangayRecords.rows) {
      const improvedBarangay = extractBarangayAdvanced(record.location);
      if (improvedBarangay && improvedBarangay !== 'Unknown') {
        await client.query(
          'UPDATE historical_fires SET barangay = $1 WHERE id = $2',
          [improvedBarangay, record.id]
        );
        fixedUnknown++;
      }
    }
    console.log(`   ✅ Fixed ${fixedUnknown} previously unknown barangay records`);
    
    // 3. Standardize damage amounts (convert text to numeric where possible)
    console.log('\n3️⃣ Cleaning up damage amounts...');
    
    const damageRecords = await client.query(
      'SELECT id, estimated_damage FROM historical_fires WHERE estimated_damage IS NOT NULL AND estimated_damage != \'\''
    );
    
    let cleanedDamage = 0;
    for (const record of damageRecords.rows) {
      const cleanDamage = cleanDamageAmount(record.estimated_damage);
      if (cleanDamage !== record.estimated_damage) {
        await client.query(
          'UPDATE historical_fires SET estimated_damage = $1 WHERE id = $2',
          [cleanDamage, record.id]
        );
        cleanedDamage++;
      }
    }
    console.log(`   ✅ Cleaned ${cleanedDamage} damage amount records`);
    
    // 4. Standardize fire types and nature
    console.log('\n4️⃣ Standardizing fire types and nature...');
    
    const fireTypeUpdates = [
      { from: 'Residential', to: 'Residential' },
      { from: 'Commercial', to: 'Commercial' },
      { from: 'Industrial', to: 'Industrial' },
      { from: 'Mixed', to: 'Mixed Use' },
      { from: 'Institution', to: 'Institutional' },
      { from: 'Vehicle', to: 'Vehicle' },
      { from: 'Informal Settlers', to: 'Informal Settlement' },
    ];
    
    for (const update of fireTypeUpdates) {
      if (update.from !== update.to) {
        const result = await client.query(
          'UPDATE historical_fires SET type_of_occupancy = $1 WHERE type_of_occupancy ILIKE $2',
          [update.to, update.from]
        );
        if (result.rowCount > 0) {
          console.log(`   ✅ Standardized ${result.rowCount} fire type records: "${update.from}" → "${update.to}"`);
        }
      }
    }
    
    // 5. Clean up coordinates - remove invalid coordinates
    console.log('\n5️⃣ Validating coordinates...');
    
    const invalidCoords = await client.query(`
      UPDATE historical_fires 
      SET latitude = NULL, longitude = NULL 
      WHERE latitude < 14.0 OR latitude > 15.0 OR longitude < 120.0 OR longitude > 122.0
      RETURNING id
    `);
    
    if (invalidCoords.rowCount > 0) {
      console.log(`   ✅ Cleared ${invalidCoords.rowCount} invalid coordinate records`);
    }
    
    // 6. Generate final statistics
    console.log('\n📊 Generating cleanup statistics...');
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT barangay) as unique_barangays,
        COUNT(*) FILTER (WHERE barangay = 'Unknown') as unknown_barangay_count,
        COUNT(*) FILTER (WHERE estimated_damage IS NOT NULL AND estimated_damage != '') as records_with_damage,
        COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as records_with_coordinates,
        MIN(date_occurred) as earliest_date,
        MAX(date_occurred) as latest_date
      FROM historical_fires
    `);
    
    console.table(stats.rows[0]);
    
    // 7. Show barangay distribution
    console.log('\n📍 Barangay distribution after cleanup:');
    const barangayStats = await client.query(`
      SELECT barangay, COUNT(*) as count
      FROM historical_fires 
      WHERE barangay IS NOT NULL
      GROUP BY barangay 
      ORDER BY count DESC
    `);
    
    console.table(barangayStats.rows);
    
    client.release();
    console.log('\n✅ Data quality cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Enhanced barangay extraction function
function extractBarangayAdvanced(location) {
  if (!location) return 'Unknown';
  
  const location_clean = location.toLowerCase().trim();
  
  // Known barangay patterns for Mandaluyong
  const barangayPatterns = [
    { pattern: /addition\s*hills/i, name: 'Addition Hills' },
    { pattern: /bagong\s*silang/i, name: 'Bagong Silang' },
    { pattern: /barangka\s*drive/i, name: 'Barangka Drive' },
    { pattern: /barangka\s*ibaba/i, name: 'Barangka Ibaba' },
    { pattern: /barangka\s*ilaya/i, name: 'Barangka Ilaya' },
    { pattern: /barangka\s*itaas/i, name: 'Barangka Itaas' },
    { pattern: /buayang\s*bato/i, name: 'Buayang Bato' },
    { pattern: /burol/i, name: 'Burol' },
    { pattern: /daang\s*bakal/i, name: 'Daang Bakal' },
    { pattern: /hagdan\s*bato\s*itaas/i, name: 'Hagdan Bato Itaas' },
    { pattern: /hagdan\s*bato\s*libis/i, name: 'Hagdan Bato Libis' },
    { pattern: /harapin\s*ang\s*bukas/i, name: 'Harapin ang Bukas' },
    { pattern: /highway\s*hills/i, name: 'Highway Hills' },
    { pattern: /hulo/i, name: 'Hulo' },
    { pattern: /mabini\s*j\.?\s*rizal/i, name: 'Mabini J. Rizal' },
    { pattern: /malamig/i, name: 'Malamig' },
    { pattern: /mauway/i, name: 'Mauway' },
    { pattern: /namayan/i, name: 'Namayan' },
    { pattern: /new\s*zanigas?/i, name: 'New Zanigas' },
    { pattern: /old\s*zanigas?/i, name: 'Old Zanigas' },
    { pattern: /pag-?asa/i, name: 'Pag-asa' },
    { pattern: /plainview/i, name: 'Plainview' },
    { pattern: /pleasant\s*hills/i, name: 'Pleasant Hills' },
    { pattern: /poblacion/i, name: 'Poblacion' },
    { pattern: /san\s*jose/i, name: 'San Jose' },
    { pattern: /vergara/i, name: 'Vergara' },
    { pattern: /wack\s*wack/i, name: 'Wack Wack Greenhills' },
  ];
  
  // Try to match known barangay patterns
  for (const { pattern, name } of barangayPatterns) {
    if (pattern.test(location)) {
      return name;
    }
  }
  
  // Fallback to original extraction logic
  const parts = location.split(',');
  for (const part of parts) {
    const cleaned = part.replace(/\b(barangay|brgy\.?)\s*/i, '').trim();
    if (cleaned && 
        !cleaned.toLowerCase().includes('mandaluyong') && 
        !cleaned.toLowerCase().includes('city') &&
        !cleaned.toLowerCase().includes('street') &&
        !cleaned.toLowerCase().includes('avenue') &&
        cleaned.length > 2) {
      return cleaned;
    }
  }
  
  return 'Unknown';
}

// Clean damage amount function
function cleanDamageAmount(damage) {
  if (!damage || damage.trim() === '') return '';
  
  // Remove common text patterns and extract numeric value
  let cleaned = damage.toString()
    .replace(/[₱$,]/g, '') // Remove currency symbols and commas
    .replace(/\s*(php|pesos?|thousand|million|billion)\s*/gi, '') // Remove currency words
    .replace(/[^\d.]/g, '') // Keep only digits and decimal points
    .trim();
  
  // Validate it's a reasonable number
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) {
    return '0.00';
  }
  
  return num.toFixed(2);
}

// Run the cleanup
cleanupDataQualityIssues();