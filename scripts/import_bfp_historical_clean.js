const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// Helper function to extract barangay from location string
function extractBarangayFromLocation(location) {
  if (!location) return null;
  
  // Clean up and extract barangay name
  let barangay = location
    .replace(/,.*$/, '') // Remove everything after first comma
    .replace(/\b(barangay|brgy\.?)\s*/i, '') // Remove "Barangay" prefix
    .trim();
  
  // Handle common location formats
  if (barangay.toLowerCase().includes('mandaluyong')) {
    // Try to extract barangay name before "Mandaluyong"
    const parts = location.split(',');
    for (const part of parts) {
      const cleaned = part.replace(/\b(barangay|brgy\.?)\s*/i, '').trim();
      if (cleaned && !cleaned.toLowerCase().includes('mandaluyong') && !cleaned.toLowerCase().includes('city')) {
        barangay = cleaned;
        break;
      }
    }
  }
  
  return barangay || 'Unknown';
}

// Helper function to parse various date formats
function parseFlexibleDate(dateStr) {
  if (!dateStr) throw new Error('Empty date');
  
  // Remove any extra whitespace
  dateStr = dateStr.trim();
  
  // Try different date formats
  const formats = [
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year, month, day;
      
      if (format.source.startsWith('^(\\\\d{4})')) {
        // YYYY-MM-DD format
        [, year, month, day] = match;
      } else {
        // Assume MM/DD/YYYY format (adjust if needed)
        [, month, day, year] = match;
      }
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} 12:00:00`;
    }
  }
  
  throw new Error(`Unrecognized date format: ${dateStr}`);
}

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
      throw new Error(`BFP historical CSV file not found at: ${csvPath}\\nPlease ensure 'historical_csv.csv' is in the project root.`);
    }
    
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    console.log(`📄 Found ${lines.length} lines in CSV (including header)`);
    console.log(`📂 Using file: ${csvPath}`);
    
    // 3. Show header info
    const headerLine = lines[0];
    console.log(`📋 CSV Header: ${headerLine}`);
    
    // 4. Process BFP historical data
    console.log('🏛️ Processing BFP historical fire data...');
    
    const dataLines = lines.slice(1); // Skip header
    let totalInserted = 0;
    let processedBarangays = new Set();
    let skippedRows = 0;
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line.trim()) continue;
      
      try {
        // Parse CSV line properly handling quoted fields
        let parts = [];
        let current = '';
        let inQuotes = false;
        let charIndex = 0;
        
        while (charIndex < line.length) {
          const char = line[charIndex];
          
          if (char === '"') {
            if (inQuotes && line[charIndex + 1] === '"') {
              // Escaped quote
              current += '"';
              charIndex += 2;
            } else {
              // Start or end quote
              inQuotes = !inQuotes;
              charIndex++;
            }
          } else if (char === ',' && !inQuotes) {
            // Field separator
            parts.push(current.trim());
            current = '';
            charIndex++;
          } else {
            current += char;
            charIndex++;
          }
        }
        
        // Add the last field
        parts.push(current.trim());
        
        // Debug: log first few rows to understand the structure
        if (i < 10) {
          console.log(`Row ${i+2}: ${parts.length} fields: ${JSON.stringify(parts.slice(0, 3))}...`);
        }
        
        if (parts.length < 8) {
          console.warn(`⚠️ Line ${i+2}: Only ${parts.length} fields found, expected at least 8`);
          skippedRows++;
          continue;
        }
        
        // Extract BFP data columns
        // Expected: DATE_CLEAN, LOCATION, TYPE OF OCCUPANCY, NATURE OF FIRE, STATUS OF ALARM, CASUALTY, INJURY, ESTIMATED DAMAGE, LOCATION_CLEAN, BARANGAY
        const dateStr = parts[0]; // DATE_CLEAN
        const location = parts[1]; // LOCATION
        const typeOfOccupancy = parts[2] || null;
        const natureOfFire = parts[3] || null;
        const statusOfAlarm = parts[4] || null;
        const casualtyStr = parts[5] || '0';
        const injuryStr = parts[6] || '0';
        const estimatedDamageStr = parts[7] || '0';
        const locationClean = parts[8] || null;
        const barangayFromCSV = parts[9] || null;
        
        // Parse casualty (handle "Negative" values)
        const casualty = casualtyStr.toLowerCase() === 'negative' ? 0 : (parseInt(casualtyStr) || 0);
        
        // Parse injury (handle "Negative" values)
        const injury = injuryStr.toLowerCase() === 'negative' ? 0 : (parseInt(injuryStr) || 0);
        
        // Parse estimated damage (remove currency formatting)
        let estimatedDamage = 0;
        if (estimatedDamageStr && estimatedDamageStr.toLowerCase() !== 'negative') {
          // Remove "Php", commas, spaces, and "M/L" from damage string
          const cleanDamage = estimatedDamageStr.replace(/php|,|\s|m\/l/gi, '');
          estimatedDamage = parseFloat(cleanDamage) || 0;
        }
        
        if (!dateStr || !location) {
          skippedRows++;
          continue;
        }
        
        // Use barangay from CSV if available, otherwise extract from location
        let barangay = barangayFromCSV;
        if (!barangay || barangay.trim() === '') {
          barangay = extractBarangayFromLocation(location);
        }
        
        if (!barangay || barangay === 'Unknown') {
          console.warn(`⚠️ Line ${i+2}: Could not extract barangay from: "${location}"`);
          skippedRows++;
          continue;
        }
        
        // Parse date
        let resolvedAt;
        try {
          resolvedAt = parseFlexibleDate(dateStr);
        } catch (error) {
          console.warn(`⚠️ Line ${i+2}: Invalid date format: "${dateStr}"`);
          skippedRows++;
          continue;
        }
        
        processedBarangays.add(barangay);
        
        // Generate random coordinates within Mandaluyong bounds
        const lat = 14.5794 + (Math.random() - 0.5) * 0.02;
        const lng = 121.0359 + (Math.random() - 0.5) * 0.02;
        
        // Insert into database
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
            cause,
            reported_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          natureOfFire || 'Unknown',
          'BFP Historical Import'
        ]);
        
        totalInserted++;
        
        if (totalInserted % 100 === 0) {
          console.log(`✅ Processed ${totalInserted} records...`);
        }
        
      } catch (insertError) {
        console.warn(`⚠️ Line ${i+2}: Error processing record:`, insertError.message);
        skippedRows++;
      }
    }
    
    console.log(`\\n✅ Import completed!`);
    console.log(`📊 Successfully imported: ${totalInserted} records`);
    console.log(`❌ Skipped: ${skippedRows} records`);
    console.log(`🗺️ Barangays covered: ${processedBarangays.size}`);
    console.log(`📋 Barangays: ${Array.from(processedBarangays).sort().join(', ')}`);
    
    // 5. Verify import with statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT barangay) as unique_barangays,
        MIN(resolved_at) as earliest_date,
        MAX(resolved_at) as latest_date,
        SUM(casualties) as total_casualties,
        SUM(injuries) as total_injuries,
        SUM(estimated_damage) as total_damage
      FROM historical_fires 
      WHERE reported_by = 'BFP Historical Import'
    `);
    
    console.log('\\n📈 Import Statistics:');
    console.table(stats.rows);
    
    // 6. Show yearly distribution
    const yearlyStats = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM resolved_at) as year,
        COUNT(*) as incidents
      FROM historical_fires 
      WHERE reported_by = 'BFP Historical Import'
      GROUP BY EXTRACT(YEAR FROM resolved_at)
      ORDER BY year
    `);
    
    console.log('\\n📅 Yearly Distribution:');
    console.table(yearlyStats.rows);
    
    // 7. Sample ARIMA-ready data
    console.log('\\n🔍 Sample ARIMA-ready data:');
    const arimaPreview = await pool.query(`
      SELECT 
        barangay,
        TO_CHAR(resolved_at, 'YYYY-MM') as date_period,
        COUNT(*) as incident_count
      FROM historical_fires 
      WHERE reported_by = 'BFP Historical Import'
      GROUP BY barangay, TO_CHAR(resolved_at, 'YYYY-MM')
      ORDER BY barangay, date_period
      LIMIT 10
    `);
    
    console.table(arimaPreview.rows);
    
    // 8. Trigger forecast generation after bulk import
    console.log('\n🔄 Triggering forecast generation after historical data import...');
    const ForecastGenerationUtils = require('../services/forecastGenerationUtils');
    await ForecastGenerationUtils.triggerAfterBulkImport('BFP Historical CSV Import', totalInserted);
    
  } catch (error) {
    console.error('❌ Error importing BFP historical data:', error);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  importBFPHistoricalData();
}

module.exports = { importBFPHistoricalData };