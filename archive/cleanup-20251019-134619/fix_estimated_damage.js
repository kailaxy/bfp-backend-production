require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Parses Philippine Peso currency strings to numeric values
 * Handles formats like:
 * - "Php 20, 000.00 M/L"
 * - "PHP 1,500,000.00MLL"
 * - "Php 5, 000. 00 M/L" (with space before decimal)
 * - "PHP 600.00 M/L"
 */
function parseDamageAmount(damageStr) {
  if (!damageStr || !damageStr.trim()) {
    return null;
  }
  
  // Remove all non-numeric characters except decimal point
  // First remove "Php", "PHP", "M/L", "MLL", etc. (case-insensitive)
  let cleaned = damageStr
    .replace(/php/gi, '')       // Remove PHP/Php/php
    .replace(/m\/l/gi, '')      // Remove M/L
    .replace(/mll/gi, '')       // Remove MLL
    .replace(/\s/g, '')         // Remove all spaces
    .replace(/,/g, '')          // Remove commas
    .trim();
  
  // Parse to float
  const amount = parseFloat(cleaned);
  
  // Validate: should be a positive number
  if (isNaN(amount) || amount < 0) {
    return null;
  }
  
  return amount;
}

async function fixEstimatedDamage() {
  console.log('💰 Fixing estimated_damage values with proper currency parsing...\n');
  
  // Read the original CSV
  const csvPath = path.join(__dirname, '..', 'historical_csv.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  console.log(`📊 Reading ${lines.length - 1} records from CSV\n`);
  
  // Parse CSV to extract barangay, date, and damage
  // Helper function to parse CSV line respecting quoted fields
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
  
  const updates = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = parseCSVLine(line);
    
    // Extract fields (proper column indices now)
    const dateStr = parts[0].trim();
    const damageStr = parts[7] ? parts[7].trim().replace(/^"|"$/g, '') : null;
    const barangay = parts[parts.length - 1].trim();
    
    // Parse date
    const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) continue;
    
    const month = parseInt(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const year = parseInt(dateMatch[3]);
    const resolvedAt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    
    // Parse damage amount
    const damageAmount = parseDamageAmount(damageStr);
    
    if (damageAmount !== null) {
      updates.push({
        barangay,
        resolvedAt: resolvedAt.toISOString(),
        estimatedDamage: damageAmount,
        originalString: damageStr
      });
    }
  }
  
  console.log(`✅ Found ${updates.length} records with damage amounts\n`);
  
  // Show sample of parsed values
  console.log('📋 Sample parsed values (first 10):');
  updates.slice(0, 10).forEach((u, idx) => {
    console.log(`   ${idx + 1}. ${u.barangay} (${u.resolvedAt.substring(0, 10)})`);
    console.log(`      Original: "${u.originalString}"`);
    console.log(`      Parsed: ${u.estimatedDamage.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}\n`);
  });
  
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 1
  });
  
  try {
    console.log('🔌 Connecting to database...\n');
    
    // Update each record
    console.log('💾 Updating estimated_damage values...\n');
    
    let updated = 0;
    let notFound = 0;
    
    for (const update of updates) {
      const result = await pool.query(`
        UPDATE historical_fires 
        SET estimated_damage = $1
        WHERE barangay = $2 
          AND resolved_at = $3
      `, [update.estimatedDamage, update.barangay, update.resolvedAt]);
      
      if (result.rowCount > 0) {
        updated += result.rowCount;
      } else {
        notFound++;
        console.log(`   ⚠️ No match found for ${update.barangay} on ${update.resolvedAt.substring(0, 10)}`);
      }
    }
    
    console.log(`\n✅ Updated ${updated} records`);
    if (notFound > 0) {
      console.log(`⚠️  Could not find ${notFound} records (might be synthetic records)`);
    }
    
    // Verify results
    console.log('\n🔍 Verifying results...\n');
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(estimated_damage) as records_with_damage,
        COUNT(*) - COUNT(estimated_damage) as null_damage,
        MIN(estimated_damage) as min_damage,
        MAX(estimated_damage) as max_damage,
        AVG(estimated_damage) as avg_damage,
        SUM(estimated_damage) as total_damage
      FROM historical_fires
    `);
    
    console.log('📊 Database statistics:');
    console.log(`   Total records: ${stats.rows[0].total_records}`);
    console.log(`   Records with damage: ${stats.rows[0].records_with_damage}`);
    console.log(`   NULL damage: ${stats.rows[0].null_damage}`);
    console.log(`   Min damage: ${parseFloat(stats.rows[0].min_damage || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`);
    console.log(`   Max damage: ${parseFloat(stats.rows[0].max_damage || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`);
    console.log(`   Avg damage: ${parseFloat(stats.rows[0].avg_damage || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`);
    console.log(`   Total damage: ${parseFloat(stats.rows[0].total_damage || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`);
    
    // Show sample of barangays with highest total damage
    console.log('\n🔥 Top 10 barangays by total estimated damage:');
    const topBarangays = await pool.query(`
      SELECT 
        barangay,
        COUNT(*) as fire_count,
        SUM(estimated_damage) as total_damage,
        AVG(estimated_damage) as avg_damage
      FROM historical_fires
      WHERE estimated_damage IS NOT NULL
      GROUP BY barangay
      ORDER BY total_damage DESC
      LIMIT 10
    `);
    
    topBarangays.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.barangay}`);
      console.log(`      Fires: ${row.fire_count}, Total: ${parseFloat(row.total_damage).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}, Avg: ${parseFloat(row.avg_damage).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`);
    });
    
    console.log('\n✅ Fix complete! estimated_damage column now has numeric values.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixEstimatedDamage().catch(console.error);
