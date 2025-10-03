const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function importPredictionCSV() {
  try {
    console.log('🔥 Importing prediction.csv data as historical fire records...');
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '../../prediction.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }
    
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    console.log(`📄 Found ${lines.length} lines in CSV (including header)`);
    
    // Clear existing historical data
    console.log('🗑️ Clearing existing historical fire data...');
    await pool.query('DELETE FROM historical_fires WHERE reported_by = $1', ['Historical Data Import']);
    console.log('✅ Cleared existing historical data');
    
    // Skip header and process data
    const dataLines = lines.slice(1);
    
    let totalInserted = 0;
    let processedBarangays = new Set();
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      if (parts.length < 3) continue;
      
      const barangay = parts[0].trim();
      const datePeriod = parts[1].trim(); // Format: 2024-01
      const incidentCount = parseInt(parts[2].trim());
      
      if (!barangay || !datePeriod || isNaN(incidentCount)) {
        console.warn(`⚠️ Skipping invalid line: ${line}`);
        continue;
      }
      
      processedBarangays.add(barangay);
      
      // Parse date period (2024-01 -> 2024-01-15)
      const [year, month] = datePeriod.split('-');
      if (!year || !month) {
        console.warn(`⚠️ Invalid date format: ${datePeriod}`);
        continue;
      }
      
      // Create multiple records for the incident count
      for (let i = 0; i < incidentCount; i++) {
        // Distribute incidents randomly throughout the month
        const day = Math.floor(Math.random() * 28) + 1; // Random day 1-28
        const hour = Math.floor(Math.random() * 24); // Random hour
        const minute = Math.floor(Math.random() * 60); // Random minute
        
        const resolvedAt = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        
        try {
          // Generate random coordinates within Mandaluyong bounds
          const lat = 14.5794 + (Math.random() - 0.5) * 0.02; // Random lat around Mandaluyong
          const lng = 121.0359 + (Math.random() - 0.5) * 0.02; // Random lng around Mandaluyong
          
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
              reported_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            require('crypto').randomUUID(), // Generate UUID for id
            lat,
            lng,
            barangay,
            `${barangay}, Mandaluyong City`, // Default address
            `${Math.floor(Math.random() * 4) + 1} Alarm`, // Random alarm level 1-4 Alarm
            resolvedAt, // reported_at same as resolved_at for historical data
            resolvedAt, // resolved_at
            'Historical Data Import' // Reported by
          ]);
          
          totalInserted++;
          
        } catch (insertError) {
          console.warn(`⚠️ Failed to insert record for ${barangay} ${datePeriod}:`, insertError.message);
        }
      }
    }
    
    console.log(`✅ Successfully imported ${totalInserted} historical fire records`);
    console.log(`📊 Covered ${processedBarangays.size} barangays:`, Array.from(processedBarangays).sort());
    
    // Verify the import with some statistics
    const stats = await pool.query(`
      SELECT 
        barangay,
        COUNT(*) as incident_count,
        MIN(resolved_at) as earliest_date,
        MAX(resolved_at) as latest_date
      FROM historical_fires 
      WHERE barangay IS NOT NULL
      GROUP BY barangay 
      ORDER BY incident_count DESC
      LIMIT 10
    `);
    
    console.log('\n📈 Top 10 barangays by incident count:');
    console.table(stats.rows);
    
    // Monthly distribution check
    const monthlyStats = await pool.query(`
      SELECT 
        TO_CHAR(resolved_at, 'YYYY-MM') as month,
        COUNT(*) as incidents
      FROM historical_fires 
      WHERE barangay IS NOT NULL
      GROUP BY TO_CHAR(resolved_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);
    
    console.log('\n📅 Recent monthly distribution:');
    console.table(monthlyStats.rows);
    
  } catch (error) {
    console.error('❌ Error importing prediction CSV:', error);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  importPredictionCSV();
}

module.exports = { importPredictionCSV };