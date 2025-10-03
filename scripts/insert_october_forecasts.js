const db = require('../db');

async function insertOctoberForecasts() {
  try {
    console.log('Inserting October 2025 forecast data...');
    
    const insertQuery = `
      INSERT INTO forecasts (barangay_name, year, month, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) VALUES
      ('Bagumbayan', 2025, 10, 3.85, 2.65, 4.85, 'High', 'Elevated Risk', NOW()),
      ('Lahug', 2025, 10, 2.91, 1.87, 4.15, 'High', NULL, NOW()),
      ('Cogon Pardo', 2025, 10, 2.12, 1.32, 3.15, 'High', 'Elevated Risk', NOW()),
      ('Guadalupe', 2025, 10, 2.05, 1.28, 3.08, 'High', 'Elevated Risk', NOW()),
      ('Apas', 2025, 10, 1.98, 1.24, 2.98, 'High', NULL, NOW()),
      ('Tisa', 2025, 10, 1.87, 1.18, 2.84, 'High', NULL, NOW()),
      ('Camputhaw', 2025, 10, 1.75, 1.12, 2.68, 'High', NULL, NOW()),
      ('Capitol Site', 2025, 10, 1.65, 1.06, 2.56, 'High', NULL, NOW()),
      ('Basak San Nicolas', 2025, 10, 1.54, 0.98, 2.41, 'High', NULL, NOW()),
      ('Kasambagan', 2025, 10, 1.42, 0.91, 2.24, 'High', NULL, NOW()),
      ('Sambag I', 2025, 10, 1.31, 0.84, 2.08, 'High', NULL, NOW()),
      ('Mabolo', 2025, 10, 1.28, 0.82, 2.04, 'High', NULL, NOW()),
      ('Carreta', 2025, 10, 1.25, 0.80, 2.00, 'High', NULL, NOW()),
      ('Tejero', 2025, 10, 1.18, 0.76, 1.90, 'High', NULL, NOW()),
      ('Sambag II', 2025, 10, 1.12, 0.72, 1.82, 'High', NULL, NOW()),
      ('Zapatera', 2025, 10, 1.08, 0.70, 1.76, 'High', NULL, NOW()),
      ('Punta Princesa', 2025, 10, 1.05, 0.68, 1.72, 'High', NULL, NOW()),
      ('Kalunasan', 2025, 10, 1.02, 0.66, 1.68, 'High', NULL, NOW()),
      ('Banilad', 2025, 10, 0.98, 0.63, 1.63, 'Medium', NULL, NOW()),
      ('Duljo Fatima', 2025, 10, 0.95, 0.61, 1.59, 'Medium', NULL, NOW()),
      ('Labangon', 2025, 10, 0.92, 0.59, 1.55, 'Medium', NULL, NOW()),
      ('Talamban', 2025, 10, 0.88, 0.57, 1.50, 'Medium', NULL, NOW()),
      ('Bulacao', 2025, 10, 0.85, 0.55, 1.46, 'Medium', NULL, NOW()),
      ('San Antonio', 2025, 10, 0.82, 0.53, 1.42, 'Medium', NULL, NOW()),
      ('Cogon Ramos', 2025, 10, 0.78, 0.51, 1.37, 'Medium', NULL, NOW()),
      ('Pasil', 2025, 10, 0.75, 0.49, 1.33, 'Medium', NULL, NOW()),
      ('Kinasang-an', 2025, 10, 0.72, 0.47, 1.29, 'Medium', NULL, NOW()),
      ('Suba', 2025, 10, 0.68, 0.44, 1.24, 'Medium', NULL, NOW()),
      ('Pahina Central', 2025, 10, 0.65, 0.42, 1.20, 'Medium', NULL, NOW()),
      ('Kamagayan', 2025, 10, 0.62, 0.40, 1.16, 'Medium', NULL, NOW()),
      ('Tinago', 2025, 10, 0.58, 0.38, 1.11, 'Medium', NULL, NOW()),
      ('Basak Pardo', 2025, 10, 0.55, 0.36, 1.07, 'Medium', NULL, NOW()),
      ('Busay', 2025, 10, 0.52, 0.34, 1.03, 'Medium', NULL, NOW()),
      ('Buhisan', 2025, 10, 0.48, 0.31, 0.98, 'Low-Moderate', NULL, NOW()),
      ('Sudlon I', 2025, 10, 0.45, 0.29, 0.94, 'Low-Moderate', NULL, NOW()),
      ('San Jose', 2025, 10, 0.42, 0.27, 0.90, 'Low-Moderate', NULL, NOW()),
      ('Sudlon II', 2025, 10, 0.38, 0.25, 0.85, 'Low-Moderate', NULL, NOW()),
      ('Babag', 2025, 10, 0.35, 0.23, 0.81, 'Low-Moderate', NULL, NOW()),
      ('Malubog', 2025, 10, 0.32, 0.21, 0.77, 'Low-Moderate', NULL, NOW()),
      ('Sapangdaku', 2025, 10, 0.28, 0.18, 0.72, 'Low-Moderate', NULL, NOW()),
      ('Guba', 2025, 10, 0.25, 0.16, 0.68, 'Low-Moderate', NULL, NOW()),
      ('Toong', 2025, 10, 0.22, 0.14, 0.64, 'Low-Moderate', NULL, NOW()),
      ('Sirao', 2025, 10, 0.18, 0.12, 0.59, 'Very Low', NULL, NOW()),
      ('Adlaon', 2025, 10, 0.15, 0.10, 0.55, 'Very Low', NULL, NOW()),
      ('Sinsin', 2025, 10, 0.12, 0.08, 0.51, 'Very Low', NULL, NOW()),
      ('Pulangbato', 2025, 10, 0.08, 0.05, 0.46, 'Very Low', NULL, NOW()),
      ('Bonbon', 2025, 10, 0.05, 0.03, 0.42, 'Very Low', NULL, NOW()),
      ('Budlaan', 2025, 10, 0.02, 0.01, 0.38, 'Very Low', NULL, NOW())
      ON CONFLICT (barangay_name, year, month) DO UPDATE SET
        predicted_cases = EXCLUDED.predicted_cases,
        lower_bound = EXCLUDED.lower_bound,
        upper_bound = EXCLUDED.upper_bound,
        risk_level = EXCLUDED.risk_level,
        risk_flag = EXCLUDED.risk_flag,
        created_at = NOW();
    `;

    const result = await db.query(insertQuery);
    console.log('✅ October 2025 forecast data inserted successfully');
    console.log(`Inserted/updated ${result.rowCount || 47} records`);
    
    // Verify the data
    const checkQuery = 'SELECT COUNT(*) as count FROM forecasts WHERE year = 2025 AND month = 10';
    const checkResult = await db.query(checkQuery);
    console.log(`✅ Verification: ${checkResult.rows[0].count} records found for October 2025`);
    
  } catch (error) {
    console.error('❌ Error inserting forecast data:', error);
  } finally {
    process.exit(0);
  }
}

insertOctoberForecasts();