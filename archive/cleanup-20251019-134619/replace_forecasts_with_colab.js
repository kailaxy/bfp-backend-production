/**
 * TEMPORARY: Replace forecasts table with Colab results
 * This will delete current forecasts and load data from Colab CSV
 * WARNING: This is temporary for testing - will be overwritten when forecast regenerates
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Risk categorization function (matching backend logic)
function categorizeRisk(predicted, upperBound) {
    if (upperBound >= 3.0) {
        return { level: 'High Risk', flag: 'red' };
    } else if (upperBound >= 2.0 || predicted >= 1.5) {
        return { level: 'Moderate Risk', flag: 'orange' };
    } else if (upperBound >= 1.0 || predicted >= 0.5) {
        return { level: 'Low Risk', flag: 'yellow' };
    } else {
        return { level: 'Minimal Risk', flag: 'green' };
    }
}

async function replaceForecasts() {
    console.log("=".repeat(80));
    console.log("TEMPORARY: Replacing forecasts table with Colab results");
    console.log("=".repeat(80));
    console.log("");

    const client = await pool.connect();
    
    try {
        // 1. Read CSV file
        console.log("📄 Step 1: Reading Colab CSV file...");
        const csvPath = path.join('C:', 'Users', 'Kyle Sermon', 'bfp-project', 'Forecast_Results_Oct2025_to_Dec2026 (1).csv');
        
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const forecasts = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',');
            if (values.length < 8) continue;
            
            const dateStr = values[0];
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            
            const lowerBound = parseFloat(values[1]);
            const upperBound = parseFloat(values[2]);
            const predicted = parseFloat(values[3]);
            const barangay = values[4];
            const modelUsed = values[5].replace(/"/g, '');
            const mae = parseFloat(values[6]);
            const rmse = parseFloat(values[7]);
            
            const { level: riskLevel } = categorizeRisk(predicted, upperBound);
            
            forecasts.push({
                barangay: barangay,
                year: year,
                month: month,
                predicted_cases: predicted,
                lower_bound: lowerBound,
                upper_bound: upperBound,
                risk_level: riskLevel,
                model_used: modelUsed,
                mae: mae,
                rmse: rmse
            });
        }
        
        console.log(`   ✅ Read ${forecasts.length} forecast records from CSV`);
        console.log("");

        // 2. Start transaction
        console.log("🔄 Step 2: Starting database transaction...");
        await client.query('BEGIN');
        console.log("   ✅ Transaction started");
        console.log("");

        // 3. Delete existing forecasts
        console.log("🗑️  Step 3: Deleting current forecasts...");
        const deleteResult = await client.query('DELETE FROM forecasts');
        console.log(`   ✅ Deleted ${deleteResult.rowCount} existing records`);
        console.log("");

        // 4. Insert new forecasts
        console.log("💾 Step 4: Inserting Colab forecasts...");
        
        let insertedCount = 0;
        for (const forecast of forecasts) {
            await client.query(`
                INSERT INTO forecasts 
                (barangay_name, year, month, predicted_cases, lower_bound, upper_bound, risk_level, model_used, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            `, [
                forecast.barangay,
                forecast.year,
                forecast.month,
                forecast.predicted_cases,
                forecast.lower_bound,
                forecast.upper_bound,
                forecast.risk_level,
                forecast.model_used
            ]);
            insertedCount++;
            
            if (insertedCount % 50 === 0) {
                console.log(`   ... ${insertedCount}/${forecasts.length}`);
            }
        }
        
        console.log(`   ✅ Inserted ${insertedCount} new forecast records`);
        console.log("");

        // 5. Commit transaction
        console.log("✅ Step 5: Committing transaction...");
        await client.query('COMMIT');
        console.log("   ✅ Transaction committed successfully");
        console.log("");

        // 6. Verify results
        console.log("🔍 Step 6: Verifying results...");
        const countResult = await client.query('SELECT COUNT(*) as count FROM forecasts');
        const sampleResult = await client.query(`
            SELECT barangay_name, year, month, predicted_cases, risk_level, model_used 
            FROM forecasts 
            ORDER BY barangay_name, year, month 
            LIMIT 5
        `);
        
        console.log(`   ✅ Total forecasts in database: ${countResult.rows[0].count}`);
        console.log("");
        console.log("   Sample records:");
        sampleResult.rows.forEach(row => {
            const predicted = parseFloat(row.predicted_cases);
            console.log(`   - ${row.barangay_name} ${row.year}-${String(row.month).padStart(2, '0')}: ${predicted.toFixed(4)} fires (${row.risk_level}) [${row.model_used}]`);
        });
        console.log("");

        console.log("=".repeat(80));
        console.log("✅ FORECASTS TABLE UPDATED WITH COLAB RESULTS");
        console.log("=".repeat(80));
        console.log("");
        console.log("📊 Summary:");
        console.log(`   - Deleted: ${deleteResult.rowCount} old records`);
        console.log(`   - Inserted: ${insertedCount} new records from Colab`);
        console.log(`   - Total in database: ${countResult.rows[0].count}`);
        console.log("");
        console.log("🔄 Graphs should automatically update!");
        console.log("   - Frontend will fetch new forecast data from API");
        console.log("   - /api/forecasts endpoint now serves Colab results");
        console.log("");
        console.log("⚠️  NOTE: This is TEMPORARY for testing");
        console.log("   - These forecasts use Colab's log1p/expm1 transformation");
        console.log("   - Will be overwritten if forecast regeneration runs");
        console.log("");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Error - Transaction rolled back:", error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the replacement
replaceForecasts().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
