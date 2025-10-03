const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function importBFPHistoricalData() {
  try {
    console.log('🔥 Importing BFP historical fire data...');
    
    // 1. Clear ALL existing historical data
    console.log('🗑️ Clearing ALL existing historical fire data...');
    const deleteResult = await pool.query('DELETE FROM historical_fires');
    console.log(`✅ Deleted ${deleteResult.rowCount} existing records`);
    
    // 2. Read the BFP historical CSV file
    const csvPath = path.join(__dirname, '../../historical_csv.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`BFP historical CSV file not found at: ${csvPath}\nPlease ensure 'historical_csv.csv' is in the project root.`);
    }
    
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    console.log(`📄 Found ${lines.length} lines in CSV (including header)`);
    console.log(`📂 Using file: ${csvPath}`);
    
    // 3. Parse the BFP data structure
    // Expected columns: DATE_CLEAN, LOCATION, TYPE OF OCCUPANCY, NATURE OF FIRE, STATUS OF ALARM, CASUALTY, INJURY, ESTIMATED DAMAGE
    const headerLine = lines[0];
    console.log(`📋 CSV Header: ${headerLine}`);
    
    // Skip header and process data
    const dataLines = lines.slice(1);
    
    // 4. Process BFP historical data
    console.log('🏛️ Processing BFP historical fire data...');
    
    let totalInserted = 0;
    let processedBarangays = new Set();
    let skippedRows = 0;
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line.trim()) continue;
      
      try {
        // Split by tab or comma (try both)
        let parts = line.split('\t');
        if (parts.length === 1) {
          parts = line.split(',');
        }
        parts = parts.map(part => part.trim().replace(/"/g, ''));
        
        if (parts.length < 2) {
          skippedRows++;
          continue;
        }
        
        // Extract BFP data columns
        const dateStr = parts[0]; // DATE_CLEAN
        const location = parts[1]; // LOCATION
        const typeOfOccupancy = parts[2] || null;
        const natureOfFire = parts[3] || null;
        const statusOfAlarm = parts[4] || null;
        const casualty = parseInt(parts[5]) || 0;
        const injury = parseInt(parts[6]) || 0;
        const estimatedDamage = parseFloat(parts[7]) || 0;
        
        if (!dateStr || !location) {
          skippedRows++;
          continue;
        }
        
        // Extract barangay from location
        let barangay = extractBarangayFromLocation(location);
        if (!barangay) {
          skippedRows++;
          continue;
        }
        
        // Parse date
        let resolvedAt;
        try {
          resolvedAt = parseFlexibleDate(dateStr);
        } catch (error) {
          console.warn(`⚠️ Line ${i+2}: Invalid date format: ${dateStr}`);
          skippedRows++;
          continue;
        }
        
        processedBarangays.add(barangay);
        
        // Generate random coordinates within Mandaluyong bounds
        const lat = 14.5794 + (Math.random() - 0.5) * 0.02;
        const lng = 121.0359 + (Math.random() - 0.5) * 0.02;
        
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
            lat,
            lng,
            barangay,
            location,
            statusOfAlarm || 'First Alarm',
            resolvedAt, // Use resolved date as reported date
            resolvedAt,
            casualty,
            injury,
            estimatedDamage,
            'BFP Historical Import'
          ]);
          
          totalInserted++;
          
        } catch (insertError) {
          console.warn(`⚠️ Failed to insert record for ${barangay} ${dateStr}:`, insertError.message);
          skippedRows++;
        }
      }
      
    } else if (isPredictionFormat) {
      // Process prediction format (fallback): BARANGAY, DATE_PERIOD, INCIDENT_COUNT
      console.log('📊 Processing prediction data format (fallback)...');
      
      for (const line of dataLines) {
        if (!line.trim()) continue;
        
        const parts = line.split(',');
        if (parts.length < 3) continue;
        
        const barangay = parts[0].trim();
        const datePeriod = parts[1].trim();
        const incidentCount = parseInt(parts[2].trim());
        
        if (!barangay || !datePeriod || isNaN(incidentCount)) {
          skippedRows++;
          continue;
        }
        
        processedBarangays.add(barangay);
        
        // Parse date period (2024-01 -> multiple records throughout the month)
        const [year, month] = datePeriod.split('-');
        if (!year || !month) {
          skippedRows++;
          continue;
        }
        
        // Create multiple records for the incident count
        for (let i = 0; i < incidentCount; i++) {
          const day = Math.floor(Math.random() * 28) + 1;
          const hour = Math.floor(Math.random() * 24);
          const minute = Math.floor(Math.random() * 60);
          const resolvedAt = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          
          try {
            const lat = 14.5794 + (Math.random() - 0.5) * 0.02;
            const lng = 121.0359 + (Math.random() - 0.5) * 0.02;
            
            await pool.query(`
              INSERT INTO historical_fires (
                id, lat, lng, barangay, address, alarm_level,
                reported_at, resolved_at, reported_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              require('crypto').randomUUID(),
              lat, lng, barangay,
              `${barangay}, Mandaluyong City`,
              `${Math.floor(Math.random() * 4) + 1} Alarm`,
              resolvedAt, resolvedAt,
              'BFP Historical Import'
            ]);
            
            totalInserted++;
            
          } catch (insertError) {
            console.warn(`⚠️ Failed to insert record for ${barangay} ${datePeriod}:`, insertError.message);
            skippedRows++;
          }
        }
      }
    } else {
      throw new Error('Unrecognized CSV format. Please ensure the file has proper headers.');
    }
    
    console.log(`✅ Successfully imported ${totalInserted} historical fire records`);
    console.log(`⚠️ Skipped ${skippedRows} invalid rows`);
    console.log(`📊 Covered ${processedBarangays.size} barangays:`, Array.from(processedBarangays).sort());
    
    // Verify the import with statistics
    const stats = await pool.query(`
      SELECT 
        barangay,
        COUNT(*) as incident_count,
        MIN(resolved_at) as earliest_date,
        MAX(resolved_at) as latest_date
      FROM historical_fires 
      WHERE reported_by = 'BFP Historical Import'
        AND barangay IS NOT NULL
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
      WHERE reported_by = 'BFP Historical Import'
        AND barangay IS NOT NULL
      GROUP BY TO_CHAR(resolved_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);
    
    console.log('\n📅 Recent monthly distribution:');
    console.table(monthlyStats.rows);
    
    console.log('\n🎯 Ready for ARIMA forecasting with BFP historical data!');
    
  } catch (error) {
    console.error('❌ Error importing BFP historical data:', error);
  } finally {
    process.exit(0);
  }
}

// Helper function to extract barangay from location string
function extractBarangayFromLocation(location) {
  if (!location) return null;
  
  // Common barangay names in Mandaluyong
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
  
  // Try to match barangay names
  for (const barangay of barangays) {
    if (locationLower.includes(barangay.toLowerCase())) {
      return barangay;
    }
  }
  
  // If no match found, try to extract from common patterns
  // You may need to adjust this based on actual BFP location formats
  if (locationLower.includes('brgy') || locationLower.includes('barangay')) {
    // Extract text after "brgy" or "barangay"
    const match = location.match(/(?:brgy\.?\s*|barangay\s+)([^,]+)/i);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null; // Return null if no barangay can be extracted
}

// Helper function to parse flexible date formats
function parseFlexibleDate(dateStr) {
  if (!dateStr) throw new Error('Empty date string');
  
  // Try various date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // 2024-01-15
    /^\d{2}\/\d{2}\/\d{4}$/, // 01/15/2024
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // 1/15/2024
    /^\d{4}\/\d{2}\/\d{2}$/, // 2024/01/15
  ];
  
  // Default to adding time if only date provided
  let processedDate = dateStr.trim();
  
  // If no time component, add random time
  if (!processedDate.includes(':')) {
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    processedDate += ` ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  }
  
  const date = new Date(processedDate);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  
  return date.toISOString();
}

// Run if called directly
if (require.main === module) {
  importBFPHistoricalData();
}

module.exports = { importBFPHistoricalData };