// ==============================
// Database Analysis & Migration Tool
// ==============================
/**
 * Analyze local database and prepare migration to Render
 * Shows complete database structure and data counts
 */

const { Pool } = require('pg');
require('dotenv').config();

// Local database configuration
const localPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bfp_db',
    user: process.env.DB_USER || 'bfp_user',
    password: process.env.DB_PASSWORD || 'bfp_password'
});

async function analyzeLocalDatabase() {
    console.log('🔍 === LOCAL DATABASE ANALYSIS ===\n');
    
    try {
        // Get all tables
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        
        const tables = await localPool.query(tablesQuery);
        console.log(`📊 Tables found: ${tables.rows.length}\n`);
        
        let totalRecords = 0;
        const tableInfo = [];
        
        // Analyze each table
        for (const table of tables.rows) {
            const tableName = table.table_name;
            
            try {
                // Get record count
                const countResult = await localPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
                const count = parseInt(countResult.rows[0].count);
                totalRecords += count;
                
                // Get table structure
                const columnsQuery = `
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `;
                
                const columns = await localPool.query(columnsQuery, [tableName]);
                
                tableInfo.push({
                    name: tableName,
                    count: count,
                    columns: columns.rows.length
                });
                
                console.log(`📋 ${tableName}:`);
                console.log(`   Records: ${count.toLocaleString()}`);
                console.log(`   Columns: ${columns.rows.length}`);
                
                // Show sample data for important tables
                if (count > 0 && ['users', 'historical_fires', 'forecasts', 'fire_stations'].includes(tableName)) {
                    const sampleQuery = `SELECT * FROM "${tableName}" LIMIT 2`;
                    const sample = await localPool.query(sampleQuery);
                    console.log(`   Sample columns: ${Object.keys(sample.rows[0] || {}).join(', ')}`);
                }
                
                console.log('');
                
            } catch (error) {
                console.log(`   ❌ Error analyzing ${tableName}: ${error.message}\n`);
            }
        }
        
        console.log('📈 === SUMMARY ===');
        console.log(`Total tables: ${tables.rows.length}`);
        console.log(`Total records: ${totalRecords.toLocaleString()}`);
        
        // Show table sizes
        console.log('\n📊 Largest tables:');
        tableInfo
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .forEach(table => {
                console.log(`   ${table.name}: ${table.count.toLocaleString()} records`);
            });
        
        return tableInfo;
        
    } catch (error) {
        console.error('❌ Database analysis error:', error.message);
        return null;
    }
}

async function generateMigrationScript(tableInfo) {
    console.log('\n🚀 === MIGRATION PREPARATION ===\n');
    
    if (!tableInfo || tableInfo.length === 0) {
        console.log('❌ No table information available for migration script');
        return;
    }
    
    console.log('📝 Migration tasks needed:');
    
    // Essential tables for migration
    const criticalTables = ['users', 'historical_fires', 'forecasts', 'fire_stations', 'barangays'];
    const foundCritical = tableInfo.filter(t => criticalTables.includes(t.name));
    
    console.log('\n🔥 Critical tables for BFP system:');
    foundCritical.forEach(table => {
        console.log(`   ✅ ${table.name}: ${table.count.toLocaleString()} records`);
    });
    
    const missingCritical = criticalTables.filter(name => !tableInfo.find(t => t.name === name));
    if (missingCritical.length > 0) {
        console.log('\n⚠️  Missing critical tables:');
        missingCritical.forEach(name => console.log(`   ❌ ${name}`));
    }
    
    console.log('\n📋 Migration approach:');
    console.log('1. Export local database structure (schema)');
    console.log('2. Export local database data');
    console.log('3. Create Render database connection');
    console.log('4. Import schema to Render database');
    console.log('5. Import data to Render database');
    console.log('6. Verify data integrity');
    
    return foundCritical;
}

async function main() {
    try {
        const tableInfo = await analyzeLocalDatabase();
        await generateMigrationScript(tableInfo);
        
        console.log('\n✅ Analysis complete! Ready to proceed with migration.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await localPool.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = { analyzeLocalDatabase, generateMigrationScript };