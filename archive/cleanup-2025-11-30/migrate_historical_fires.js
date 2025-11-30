require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrateHistoricalFiresData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Add missing columns
    console.log('🔧 Step 1: Adding missing columns...\n');
    
    await client.query(`
      ALTER TABLE historical_fires 
      ADD COLUMN IF NOT EXISTS type_of_occupancy VARCHAR(100),
      ADD COLUMN IF NOT EXISTS nature_of_fire VARCHAR(100),
      ADD COLUMN IF NOT EXISTS status VARCHAR(50)
    `);
    console.log('✅ Added columns: type_of_occupancy, nature_of_fire, status\n');

    // Step 2: Read and parse CSV file
    console.log('🔧 Step 2: Reading CSV file...\n');
    
    const csvPath = path.join(__dirname, '..', 'normalized_fire_data.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Found ${lines.length - 1} records in CSV (excluding header)\n`);

    // Parse CSV header
    const headers = lines[0].split(',').map(h => h.trim());
    console.log('CSV Columns:', headers.join(', '));
    console.log('');

    // Step 3: Clear existing data
    console.log('🔧 Step 3: Clearing existing historical_fires data...\n');
    const deleteResult = await client.query('DELETE FROM historical_fires');
    console.log(`✅ Deleted ${deleteResult.rowCount} existing records\n`);

    // Step 4: Import new data
    console.log('🔧 Step 4: Importing new data...\n');
    
    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        // Split CSV line (handling quoted values with commas)
        const values = parseCSVLine(line);
        
        if (values.length < 9) {
          skippedCount++;
          continue;
        }

        const [
          dateStr,
          location,
          typeOfOccupancy,
          natureOfFire,
          statusOfAlarm,
          casualty,
          injury,
          estimatedDamage,
          barangay
        ] = values;

        // Skip if missing critical data
        if (!dateStr || !barangay) {
          skippedCount++;
          continue;
        }

        // Parse date (format: MM/DD/YYYY)
        const [month, day, year] = dateStr.split('/');
        const fireDate = new Date(`${year}-${month}-${day}`);
        
        if (isNaN(fireDate.getTime())) {
          skippedCount++;
          errors.push(`Line ${i + 1}: Invalid date ${dateStr}`);
          continue;
        }

        // Parse casualties and injuries
        const casualties = casualty && casualty.toLowerCase() !== 'negative' ? parseInt(casualty) || 0 : 0;
        const injuries = injury && injury.toLowerCase() !== 'negative' ? parseInt(injury) || 0 : 0;

        // Parse estimated damage (remove "Php", commas, spaces, "M/L")
        let damage = 0;
        if (estimatedDamage && estimatedDamage.toLowerCase() !== 'negative') {
          const damageStr = estimatedDamage
            .replace(/Php/gi, '')
            .replace(/M\/L/gi, '')
            .replace(/,/g, '')
            .replace(/\s/g, '')
            .trim();
          damage = parseFloat(damageStr) || 0;
        }

        // Clean barangay name
        const cleanBarangay = barangay.trim();

        // Insert record with dummy lat/lng (will be geocoded later)
        await client.query(`
          INSERT INTO historical_fires (
            barangay,
            address,
            type_of_occupancy,
            nature_of_fire,
            alarm_level,
            status,
            casualties,
            injuries,
            estimated_damage,
            reported_at,
            resolved_at,
            lat,
            lng
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $12)
        `, [
          cleanBarangay,
          location || 'Unknown',
          typeOfOccupancy || null,
          natureOfFire || null,
          statusOfAlarm || null,
          'Resolved',
          casualties,
          injuries,
          damage,
          fireDate,
          14.5794, // Default Mandaluyong City lat
          121.0359  // Default Mandaluyong City lng
        ]);

        importedCount++;
        
        if (importedCount % 100 === 0) {
          console.log(`   Imported ${importedCount} records...`);
        }

      } catch (err) {
        skippedCount++;
        errors.push(`Line ${i + 1}: ${err.message}`);
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${importedCount} records`);
    console.log(`   Skipped: ${skippedCount} records`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log(`\n⚠️  Errors encountered:`);
      errors.forEach(err => console.log(`   - ${err}`));
    } else if (errors.length > 10) {
      console.log(`\n⚠️  ${errors.length} errors encountered (showing first 10):`);
      errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    }

    // Step 5: Verify import
    console.log('\n🔧 Step 5: Verifying import...\n');
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT barangay) as unique_barangays,
        MIN(reported_at) as earliest_fire,
        MAX(reported_at) as latest_fire,
        SUM(casualties) as total_casualties,
        SUM(injuries) as total_injuries,
        SUM(estimated_damage) as total_damage
      FROM historical_fires
    `);

    const s = stats.rows[0];
    console.log('📊 Import Statistics:');
    console.log(`   Total records: ${s.total}`);
    console.log(`   Unique barangays: ${s.unique_barangays}`);
    console.log(`   Date range: ${new Date(s.earliest_fire).toLocaleDateString()} - ${new Date(s.latest_fire).toLocaleDateString()}`);
    console.log(`   Total casualties: ${s.total_casualties}`);
    console.log(`   Total injuries: ${s.total_injuries}`);
    console.log(`   Total damage: ₱${parseFloat(s.total_damage).toLocaleString()}`);

    console.log('\n✅ MIGRATION COMPLETE!');
    console.log('   All historical fire data has been replaced.');
    console.log('   Next: Update the resolve fire form to include new fields.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Helper function to parse CSV line with quoted values
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

migrateHistoricalFiresData().catch(console.error);
