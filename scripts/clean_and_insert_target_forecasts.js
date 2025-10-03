const db = require('../db');

async function cleanAndInsertTargetForecasts() {
  try {
    console.log('Cleaning existing forecast data...');
    
    // Clear all existing forecasts for October 2025
    await db.query('DELETE FROM forecasts WHERE year = 2025 AND month = 10');
    console.log('✅ Existing October 2025 data cleared');
    
    console.log('Inserting target barangay forecast data...');
    
    const insertQuery = `
      INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) VALUES
      ('Addition Hills', 10, 2025, 1.015, 0.000, 3.519, 'High', 'Elevated Risk', NOW()),
      ('Bagong Silang', 10, 2025, 0.100, 0.000, 0.694, 'Very Low', NULL, NOW()),
      ('Barangka Drive', 10, 2025, 0.231, 0.000, 1.922, 'Low-Moderate', NULL, NOW()),
      ('Barangka Ibaba', 10, 2025, 0.105, 0.000, 0.701, 'Very Low', NULL, NOW()),
      ('Barangka Ilaya', 10, 2025, 0.316, 0.000, 1.525, 'Low-Moderate', NULL, NOW()),
      ('Barangka Itaas', 10, 2025, 0.173, 0.000, 0.982, 'Very Low', NULL, NOW()),
      ('Buayang Bato', 10, 2025, 0.070, 0.000, 0.920, 'Very Low', NULL, NOW()),
      ('Burol', 10, 2025, 0.079, 0.000, 0.662, 'Very Low', NULL, NOW()),
      ('Daang Bakal', 10, 2025, 0.145, 0.000, 0.970, 'Very Low', NULL, NOW()),
      ('Hagdan Bato Itaas', 10, 2025, 0.079, 0.000, 0.654, 'Very Low', NULL, NOW()),
      ('Hagdan Bato Libis', 10, 2025, 0.099, 0.000, 0.688, 'Very Low', NULL, NOW()),
      ('Harapin ang Bukas', 10, 2025, 0.088, 0.000, 0.651, 'Very Low', NULL, NOW()),
      ('Highway Hills', 10, 2025, 0.760, 0.000, 2.528, 'Medium', 'Watchlist', NOW()),
      ('Hulo', 10, 2025, 0.478, 0.000, 2.329, 'Low-Moderate', 'Watchlist', NOW()),
      ('Mabini J. Rizal', 10, 2025, 0.109, 0.000, 0.868, 'Very Low', NULL, NOW()),
      ('Malamig', 10, 2025, 0.220, 0.000, 1.236, 'Low-Moderate', NULL, NOW()),
      ('Mauway', 10, 2025, 0.161, 0.000, 1.482, 'Very Low', NULL, NOW()),
      ('Namayan', 10, 2025, 0.059, 0.000, 0.717, 'Very Low', NULL, NOW()),
      ('New Zaniga', 10, 2025, 0.141, 0.000, 1.150, 'Very Low', NULL, NOW()),
      ('Old Zaniga', 10, 2025, 0.095, 0.000, 0.899, 'Very Low', NULL, NOW()),
      ('Pag-asa', 10, 2025, 0.214, 0.000, 1.001, 'Low-Moderate', NULL, NOW()),
      ('Plainview', 10, 2025, 0.889, 0.000, 3.294, 'Medium', 'Elevated Risk', NOW()),
      ('Pleasant Hills', 10, 2025, 0.079, 0.000, 0.909, 'Very Low', NULL, NOW()),
      ('Poblacion', 10, 2025, 0.160, 0.000, 1.427, 'Very Low', NULL, NOW()),
      ('San Jose', 10, 2025, 0.179, 0.000, 0.921, 'Very Low', NULL, NOW()),
      ('Unknown', 10, 2025, 0.071, 0.000, 0.334, 'Very Low', NULL, NOW()),
      ('Vergara', 10, 2025, 0.110, 0.000, 0.765, 'Very Low', NULL, NOW()),
      ('Wack-wack Greenhills', 10, 2025, 0.389, 0.000, 1.734, 'Low-Moderate', NULL, NOW());
    `;

    const result = await db.query(insertQuery);
    console.log('✅ Target barangay forecast data inserted successfully');
    console.log(`Inserted ${result.rowCount || 28} records`);
    
    // Verify the data
    const checkQuery = 'SELECT COUNT(*) as count FROM forecasts WHERE year = 2025 AND month = 10';
    const checkResult = await db.query(checkQuery);
    console.log(`✅ Verification: ${checkResult.rows[0].count} records found for October 2025`);
    
    // Show summary by risk level
    const summaryQuery = `
      SELECT risk_level, COUNT(*) as count 
      FROM forecasts 
      WHERE year = 2025 AND month = 10 
      GROUP BY risk_level 
      ORDER BY CASE risk_level 
        WHEN 'High' THEN 1 
        WHEN 'Medium' THEN 2 
        WHEN 'Low-Moderate' THEN 3 
        WHEN 'Very Low' THEN 4 
        ELSE 5 END;
    `;
    const summaryResult = await db.query(summaryQuery);
    console.log('\n📊 Risk Level Summary:');
    summaryResult.rows.forEach(row => {
      console.log(`  ${row.risk_level}: ${row.count} barangays`);
    });
    
  } catch (error) {
    console.error('❌ Error cleaning and inserting forecast data:', error);
  } finally {
    process.exit(0);
  }
}

cleanAndInsertTargetForecasts();