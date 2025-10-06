// ==============================
// Database Migration Tool - Local to Render
// ==============================
/**
 * Complete database migration from local PostgreSQL to Render PostgreSQL
 * Handles schema creation and data transfer with integrity checks
 */

const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

// Local database configuration
const localPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bfp_db',
    user: process.env.DB_USER || 'bfp_user',
    password: process.env.DB_PASSWORD || 'bfp_password'
});

// Render database configuration (you'll need to set these)
let renderPool = null;

function initRenderConnection(renderDatabaseUrl) {
    if (!renderDatabaseUrl) {
        console.log('❌ Please provide Render database URL');
        return false;
    }
    
    renderPool = new Pool({
        connectionString: renderDatabaseUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    return true;
}

async function exportTableSchema(tableName) {
    try {
        // Get table structure
        const schemaQuery = `
            SELECT 
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position
        `;
        
        const columns = await localPool.query(schemaQuery, [tableName]);
        
        // Get constraints
        const constraintsQuery = `
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = $1
        `;
        
        const constraints = await localPool.query(constraintsQuery, [tableName]);
        
        return {
            columns: columns.rows,
            constraints: constraints.rows
        };
        
    } catch (error) {
        console.error(`❌ Error exporting ${tableName} schema:`, error.message);
        return null;
    }
}

async function generateCreateTableSQL(tableName, schema) {
    if (!schema) return null;
    
    let sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\\n`;
    
    const columnDefs = schema.columns.map(col => {
        let def = `  "${col.column_name}" ${col.data_type}`;
        
        if (col.character_maximum_length) {
            def += `(${col.character_maximum_length})`;
        }
        
        if (col.is_nullable === 'NO') {
            def += ' NOT NULL';
        }
        
        if (col.column_default) {
            def += ` DEFAULT ${col.column_default}`;
        }
        
        return def;
    });
    
    sql += columnDefs.join(',\\n');
    sql += '\\n);';
    
    return sql;
}

async function exportTableData(tableName, batchSize = 1000) {
    try {
        console.log(`📦 Exporting ${tableName} data...`);
        
        // Get total count
        const countResult = await localPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
        const totalRecords = parseInt(countResult.rows[0].count);
        
        if (totalRecords === 0) {
            console.log(`   ⚠️  ${tableName} is empty, skipping data export`);
            return [];
        }
        
        console.log(`   📊 ${totalRecords.toLocaleString()} records to export`);
        
        const allData = [];
        let offset = 0;
        
        while (offset < totalRecords) {
            const batchQuery = `SELECT * FROM "${tableName}" LIMIT ${batchSize} OFFSET ${offset}`;
            const batch = await localPool.query(batchQuery);
            
            allData.push(...batch.rows);
            offset += batchSize;
            
            console.log(`   ⏳ Exported ${Math.min(offset, totalRecords).toLocaleString()}/${totalRecords.toLocaleString()} records`);
        }
        
        console.log(`   ✅ ${tableName} data export complete`);
        return allData;
        
    } catch (error) {
        console.error(`❌ Error exporting ${tableName} data:`, error.message);
        return [];
    }
}

async function importTableData(tableName, data, schema) {
    if (!renderPool || data.length === 0) return false;
    
    try {
        console.log(`📥 Importing ${tableName} data to Render...`);
        
        const columns = schema.columns.map(col => `"${col.column_name}"`).join(', ');
        const placeholders = schema.columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const insertSQL = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
        
        let imported = 0;
        const batchSize = 100; // Smaller batches for network transfer
        
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            for (const row of batch) {
                const values = schema.columns.map(col => row[col.column_name]);
                
                try {
                    await renderPool.query(insertSQL, values);
                    imported++;
                } catch (error) {
                    console.log(`   ⚠️  Skipped row ${i + 1}: ${error.message}`);
                }
            }
            
            console.log(`   ⏳ Imported ${Math.min(i + batchSize, data.length).toLocaleString()}/${data.length.toLocaleString()} records`);
        }
        
        console.log(`   ✅ ${tableName} import complete: ${imported.toLocaleString()} records`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error importing ${tableName}:`, error.message);
        return false;
    }
}

async function verifyMigration(tableName) {
    if (!renderPool) return false;
    
    try {
        const localCount = await localPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
        const renderCount = await renderPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
        
        const localTotal = parseInt(localCount.rows[0].count);
        const renderTotal = parseInt(renderCount.rows[0].count);
        
        console.log(`📊 ${tableName} verification:`);
        console.log(`   Local: ${localTotal.toLocaleString()} records`);
        console.log(`   Render: ${renderTotal.toLocaleString()} records`);
        
        if (localTotal === renderTotal) {
            console.log(`   ✅ Migration verified - counts match`);
            return true;
        } else {
            console.log(`   ⚠️  Migration incomplete - ${localTotal - renderTotal} records missing`);
            return false;
        }
        
    } catch (error) {
        console.error(`❌ Error verifying ${tableName}:`, error.message);
        return false;
    }
}

async function migrateCompleteDatabase(renderDatabaseUrl) {
    console.log('🚀 === COMPLETE DATABASE MIGRATION ===\\n');
    
    if (!initRenderConnection(renderDatabaseUrl)) {
        return false;
    }
    
    try {
        // Test Render connection
        console.log('🔌 Testing Render database connection...');
        await renderPool.query('SELECT NOW()');
        console.log('✅ Render connection successful\\n');
        
        // Get all tables to migrate
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
            ORDER BY table_name
        `;
        
        const tables = await localPool.query(tablesQuery);
        console.log(`📋 Tables to migrate: ${tables.rows.length}\\n`);
        
        const migrationResults = [];
        
        for (const table of tables.rows) {
            const tableName = table.table_name;
            console.log(`🔄 Migrating ${tableName}...`);
            
            try {
                // 1. Export schema
                const schema = await exportTableSchema(tableName);
                if (!schema) continue;
                
                // 2. Create table in Render
                const createSQL = await generateCreateTableSQL(tableName, schema);
                if (createSQL) {
                    await renderPool.query(createSQL);
                    console.log(`   ✅ Table ${tableName} created in Render`);
                }
                
                // 3. Export and import data
                const data = await exportTableData(tableName);
                if (data.length > 0) {
                    const imported = await importTableData(tableName, data, schema);
                    if (imported) {
                        const verified = await verifyMigration(tableName);
                        migrationResults.push({
                            table: tableName,
                            success: verified,
                            records: data.length
                        });
                    }
                } else {
                    migrationResults.push({
                        table: tableName,
                        success: true,
                        records: 0
                    });
                }
                
                console.log('');
                
            } catch (error) {
                console.error(`❌ Error migrating ${tableName}:`, error.message);
                migrationResults.push({
                    table: tableName,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // Summary
        console.log('📊 === MIGRATION SUMMARY ===');
        const successful = migrationResults.filter(r => r.success);
        const failed = migrationResults.filter(r => !r.success);
        
        console.log(`✅ Successful: ${successful.length} tables`);
        console.log(`❌ Failed: ${failed.length} tables`);
        
        const totalRecords = successful.reduce((sum, r) => sum + r.records, 0);
        console.log(`📦 Total records migrated: ${totalRecords.toLocaleString()}`);
        
        if (successful.length > 0) {
            console.log('\\n✅ Successfully migrated:');
            successful.forEach(r => console.log(`   ${r.table}: ${r.records.toLocaleString()} records`));
        }
        
        if (failed.length > 0) {
            console.log('\\n❌ Failed migrations:');
            failed.forEach(r => console.log(`   ${r.table}: ${r.error || 'Unknown error'}`));
        }
        
        return successful.length === migrationResults.length;
        
    } catch (error) {
        console.error('❌ Migration error:', error.message);
        return false;
    } finally {
        await localPool.end();
        if (renderPool) await renderPool.end();
    }
}

// Usage instructions
function showUsage() {
    console.log('🔥 === BFP DATABASE MIGRATION TOOL ===\\n');
    console.log('This tool migrates your complete local database to Render.\\n');
    console.log('📋 What will be migrated:');
    console.log('   • historical_fires (1,299 records)');
    console.log('   • forecasts (324 records)');
    console.log('   • barangays (27 records)');
    console.log('   • users (5 records)');
    console.log('   • All other BFP system tables\\n');
    console.log('🚀 To start migration:');
    console.log('   node scripts/database_migration.js "your_render_database_url"\\n');
    console.log('🔗 Get your Render database URL from:');
    console.log('   Render Dashboard > Database > External Database URL\\n');
}

async function main() {
    const renderUrl = process.argv[2];
    
    if (!renderUrl) {
        showUsage();
        return;
    }
    
    console.log('⚠️  WARNING: This will migrate ALL data to your Render database.');
    console.log('Make sure your Render database is ready and backed up if needed.\\n');
    
    const success = await migrateCompleteDatabase(renderUrl);
    
    if (success) {
        console.log('\\n🎉 Complete database migration successful!');
        console.log('Your BFP system is now ready to use the Render database.');
    } else {
        console.log('\\n❌ Migration completed with errors. Check the logs above.');
    }
}

if (require.main === module) {
    main();
}

module.exports = { migrateCompleteDatabase, exportTableData, importTableData };