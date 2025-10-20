require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function updateCauseFromCSV() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read CSV file
    console.log('📂 Reading CSV file...\n');
    const csvPath = path.join(__dirname, '..', 'normalized_fire_data.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Found ${lines.length - 1} records in CSV\n`);

    // Clear existing data and re-import with correct mapping
    console.log('🔧 Clearing existing data...\n');
    await client.query('DELETE FROM historical_fires');
    
    console.log('🔧 Re-importing data with correct cause mapping...\n');
    
    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const values = parseCSVLine(line);
        
        if (values.length < 9) {
          skippedCount++;
          continue;
        }

        const [
          dateStr,
          location,
          typeOfOccupancy,
          natureOfFire,        // This is the CAUSE!
          statusOfAlarm,
          casualty,
          injury,
          estimatedDamage,
          barangay
        ] = values;

        if (!dateStr || !barangay) {
          skippedCount++;
          continue;
        }

        // Parse date
        const [month, day, year] = dateStr.split('/');
        const fireDate = new Date(`${year}-${month}-${day}`);
        
        if (isNaN(fireDate.getTime())) {
          skippedCount++;
          continue;
        }

        // Parse casualties and injuries
        const casualties = casualty && casualty.toLowerCase() !== 'negative' ? parseInt(casualty) || 0 : 0;
        const injuries = injury && injury.toLowerCase() !== 'negative' ? parseInt(injury) || 0 : 0;

        // Parse estimated damage
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

        const cleanBarangay = barangay.trim();

        // Insert with CAUSE properly mapped
        await client.query(`
          INSERT INTO historical_fires (
            barangay,
            address,
            type_of_occupancy,
            cause,
            alarm_level,
            casualties,
            injuries,
            estimated_damage,
            reported_at,
            resolved_at,
            lat,
            lng
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11)
        `, [
          cleanBarangay,
          location || 'Unknown',
          typeOfOccupancy || null,
          natureOfFire || null,     // CAUSE from CSV
          statusOfAlarm || null,
          casualties,
          injuries,
          damage,
          fireDate,
          14.5794,
          121.0359
        ]);

        importedCount++;
        
        if (importedCount % 100 === 0) {
          console.log(`   Imported ${importedCount} records...`);
        }

      } catch (err) {
        skippedCount++;
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${importedCount} records`);
    console.log(`   Skipped: ${skippedCount} records\n`);

    // Verify cause values
    const causesResult = await client.query(`
      SELECT cause, COUNT(*) as count
      FROM historical_fires
      WHERE cause IS NOT NULL AND cause != ''
      GROUP BY cause
      ORDER BY count DESC
    `);

    console.log('📊 Cause values now in database:\n');
    causesResult.rows.forEach(row => {
      console.log(`   "${row.cause}" - ${row.count} records`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

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

updateCauseFromCSV().catch(console.error);
