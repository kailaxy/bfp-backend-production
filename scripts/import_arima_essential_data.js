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
      if (cleaned.length > 2 && cleaned.length < 50 && 
          !cleaned.toLowerCase().includes('mandaluyong') &&
          !cleaned.toLowerCase().includes('city')) {
        return cleaned;
      }
    }
  }
  
  return barangay.length > 2 && barangay.length < 50 ? barangay : null;
}

// Helper function to parse date - handles both MM/DD/YYYY and DD/MM/YYYY formats
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let month = parseInt(parts[0]);
      let day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      // Basic year validation
      if (year < 2000 || year > 2025) return null;
      
      // Try MM/DD/YYYY format first
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        // Additional validation: check if this day is possible in this month
        const testDate = new Date(year, month - 1, day);
        if (testDate.getFullYear() === year && 
            testDate.getMonth() === month - 1 && 
            testDate.getDate() === day) {
          return testDate;
        }
      }
      
      // If MM/DD/YYYY failed, try DD/MM/YYYY format
      if (day >= 1 && day <= 12 && month >= 1 && month <= 31) {
        // Swap day and month
        const swappedMonth = day;
        const swappedDay = month;
        
        // Validate the swapped date
        const testDate = new Date(year, swappedMonth - 1, swappedDay);
        if (testDate.getFullYear() === year && 
            testDate.getMonth() === swappedMonth - 1 && 
            testDate.getDate() === swappedDay) {
          return testDate;
        }
      }
      
      // If both formats failed but numbers are reasonable, try DD/MM/YYYY anyway
      if (month >= 13 && month <= 31 && day >= 1 && day <= 12) {
        // This is definitely DD/MM/YYYY format (month > 12)
        const swappedMonth = day;
        const swappedDay = month;
        
        const testDate = new Date(year, swappedMonth - 1, swappedDay);
        if (testDate.getFullYear() === year && 
            testDate.getMonth() === swappedMonth - 1 && 
            testDate.getDate() === swappedDay) {
          return testDate;
        }
      }
    }
  } catch (error) {
    // Ignore parsing errors
  }
  
  return null;
}

// Custom CSV parser for quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current.trim());
  return fields;
}

async function importARIMAEssentialData() {
  try {
    console.log('🔥 Importing ARIMA-essential data (date + barangay + count)...');
    console.log('📋 Focusing on: Date, Location/Barangay for incident counting');
    
    // Clear existing data
    console.log('🗑️ Clearing existing historical fire data...');
    const deleteResult = await pool.query('DELETE FROM historical_fires');
    console.log('✅ Connected to PostgreSQL');
    console.log(`✅ Deleted ${deleteResult.rowCount} existing records`);
    
    // Read CSV file
    const csvFilePath = path.join(__dirname, '../../historical_csv.csv');
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvData.split('\n');
    
    console.log(`📄 Found ${lines.length} lines in CSV (including header)`);
    console.log(`📂 Using file: ${csvFilePath}`);
    
    // Skip header and process data
    let importedCount = 0;
    let skippedCount = 0;
    const barangayCount = {};
    
    console.log('🏛️ Processing BFP historical fire data for ARIMA...');
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const fields = parseCSVLine(line);
        
        // We need at least some data - be more lenient
        if (fields.length < 1) {
          skippedCount++;
          continue;
        }
        
        let dateStr = fields[0];
        let locationStr = fields.length > 1 ? fields[1] : '';
        
        // Handle malformed lines where barangay might be in wrong field
        if (!dateStr || dateStr.toLowerCase().includes('brgy') || dateStr.toLowerCase().includes('barangay')) {
          // This might be a malformed line - try to find date in other fields
          for (let j = 0; j < Math.min(fields.length, 3); j++) {
            if (fields[j] && fields[j].includes('/')) {
              dateStr = fields[j];
              locationStr = fields[j === 0 ? 1 : 0] || locationStr;
              break;
            }
          }
        }
        
        // Parse date
        const parsedDate = parseDate(dateStr);
        if (!parsedDate) {
          console.log(`⚠️ Line ${i + 1}: Invalid date "${dateStr}"`);
          skippedCount++;
          continue;
        }
        
        // Extract barangay - try multiple approaches with more fallbacks
        let barangay = null;
        
        // 1. Try the last field (often contains clean barangay name)
        if (fields.length >= 10 && fields[9] && fields[9].trim() && fields[9].trim() !== 'Unknown') {
          barangay = fields[9].trim();
        }
        
        // 2. If no barangay in last field, extract from location
        if (!barangay && locationStr) {
          barangay = extractBarangayFromLocation(locationStr);
        }
        
        // 3. If still no barangay, try extracting from any field that might contain location info
        if (!barangay && fields.length > 8 && fields[8]) {
          barangay = extractBarangayFromLocation(fields[8]);
        }
        
        // 4. Try all fields for barangay patterns (last resort)
        if (!barangay) {
          for (let j = 0; j < fields.length; j++) {
            if (fields[j] && (fields[j].toLowerCase().includes('brgy') || 
                             fields[j].toLowerCase().includes('barangay'))) {
              barangay = extractBarangayFromLocation(fields[j]);
              if (barangay && barangay !== 'Unknown') break;
            }
          }
        }
        
        // 5. Final fallback - if we have location but no barangay, assign to a default
        if (!barangay || barangay === 'Unknown') {
          if (locationStr && locationStr.length > 5) {
            // If we have a valid date and some location info, assign to "Unknown Location"
            barangay = 'Unknown Location';
          } else {
            console.log(`⚠️ Line ${i + 1}: Could not extract barangay from "${locationStr}"`);
            skippedCount++;
            continue;
          }
        }
        
        // Generate synthetic data for non-nullable columns (ARIMA focus: keep ALL incidents)
        const lat = 14.5794 + (Math.random() - 0.5) * 0.02; // Mandaluyong area
        const lng = 121.0359 + (Math.random() - 0.5) * 0.02;
        const address = locationStr || 'Unknown Location';
        
        // Extract actual data when available, use defaults otherwise
        const estimatedDamage = fields.length > 7 && fields[7] ? 
          parseFloat(fields[7].replace(/[^\d.]/g, '')) || 0 : 0;
        const casualties = fields.length > 5 && fields[5] ? 
          parseInt(fields[5].replace(/[^\d]/g, '')) || 0 : 0;
        const injuries = fields.length > 6 && fields[6] ? 
          parseInt(fields[6].replace(/[^\d]/g, '')) || 0 : 0;
        const alarmLevel = fields.length > 4 && fields[4] ? fields[4] : '1st Alarm';
        const cause = fields.length > 3 && fields[3] ? fields[3] : 'Unknown';
        
        // Synthetic defaults for missing data (ARIMA doesn't need these, but DB requires them)
        const resolvedAt = new Date(parsedDate.getTime() + 60000); // +1 minute default
        
        // Insert record with synthetic defaults for missing fields (skip duration_minutes due to constraint)
        await pool.query(`
          INSERT INTO historical_fires (
            id, lat, lng, barangay, address, alarm_level, 
            reported_at, resolved_at, 
            casualties, injuries, estimated_damage, 
            cause, actions_taken, reported_by, verified_by, attachments
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, 
            $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          )
        `, [
          lat, lng, barangay, address, alarmLevel,
          parsedDate, resolvedAt, 
          casualties, injuries, estimatedDamage,
          cause, 'Fire suppression (default)', 'BFP Historical Import', 'System Import', []
        ]);
        
        importedCount++;
        barangayCount[barangay] = (barangayCount[barangay] || 0) + 1;
        
        if (importedCount % 100 === 0) {
          console.log(`✅ Processed ${importedCount} records...`);
        }
        
      } catch (error) {
        console.log(`⚠️ Line ${i + 1}: Error processing record: ${error.message}`);
        skippedCount++;
      }
    }
    
    console.log('\n✅ ARIMA-focused import completed!');
    console.log(`📊 Successfully imported: ${importedCount} records`);
    console.log(`❌ Skipped: ${skippedCount} records`);
    console.log(`🗺️ Barangays covered: ${Object.keys(barangayCount).length}`);
    console.log(`📋 Barangays: ${Object.keys(barangayCount).sort().join(', ')}`);
    
    // Generate ARIMA statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT barangay) as unique_barangays,
        MIN(reported_at) as earliest_date,
        MAX(reported_at) as latest_date,
        SUM(casualties) as total_casualties,
        SUM(injuries) as total_injuries,
        SUM(estimated_damage) as total_damage
      FROM historical_fires
    `);
    
    console.log('\n📈 Import Statistics:');
    console.table(stats.rows);
    
    // Show yearly distribution for ARIMA validation
    const yearlyStats = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM reported_at) as year,
        COUNT(*) as incidents
      FROM historical_fires
      GROUP BY EXTRACT(YEAR FROM reported_at)
      ORDER BY year
    `);
    
    console.log('\n📅 Yearly Distribution (ARIMA Time Series):');
    console.table(yearlyStats.rows);
    
    // Show ARIMA-ready monthly aggregation sample
    const arimaPreview = await pool.query(`
      SELECT 
        barangay,
        TO_CHAR(reported_at, 'YYYY-MM') as date_period,
        COUNT(*) as incident_count
      FROM historical_fires
      WHERE barangay IN (
        SELECT barangay 
        FROM historical_fires 
        GROUP BY barangay 
        ORDER BY COUNT(*) DESC 
        LIMIT 3
      )
      GROUP BY barangay, TO_CHAR(reported_at, 'YYYY-MM')
      ORDER BY barangay, date_period
      LIMIT 15
    `);
    
    console.log('\n🔍 Sample ARIMA-ready data (barangay + month + count):');
    console.table(arimaPreview.rows);
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  }
}

// Run the import
importARIMAEssentialData().catch(console.error);