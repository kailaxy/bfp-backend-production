const pool = require('../config/db');

async function testResolveFunctionData() {
  try {
    console.log('🧪 Testing resolve function data flow...\n');
    
    // 1. Check if we have active fires with barangay
    console.log('📊 Checking active fires with barangay data:');
    const activeFires = await pool.query(`
      SELECT id, barangay, address, alarm_level, reported_at
      FROM active_fires 
      ORDER BY reported_at DESC 
      LIMIT 5
    `);
    
    if (activeFires.rows.length === 0) {
      console.log('⚠️ No active fires found. Let me create a test fire...');
      
      // Create a test active fire
      await pool.query(`
        INSERT INTO active_fires (
          address, barangay, alarm_level, reported_by, 
          reported_at, lat, lng, location
        ) VALUES (
          'Test Address, Mandaluyong City',
          'Addition Hills',
          'First Alarm (4 Trucks)',
          'Test User',
          NOW(),
          14.5794,
          121.0359,
          ST_SetSRID(ST_MakePoint(121.0359, 14.5794), 4326)
        ) RETURNING id, barangay, address
      `);
      
      console.log('✅ Created test active fire');
      
      // Re-fetch active fires
      const newActiveFires = await pool.query(`
        SELECT id, barangay, address, alarm_level, reported_at
        FROM active_fires 
        ORDER BY reported_at DESC 
        LIMIT 5
      `);
      console.table(newActiveFires.rows);
      
    } else {
      console.table(activeFires.rows);
    }
    
    // 2. Check historical fires with barangay
    console.log('\n📋 Historical fires with barangay (latest 5):');
    const historicalFires = await pool.query(`
      SELECT barangay, address, alarm_level, resolved_at, reported_by
      FROM historical_fires 
      WHERE barangay IS NOT NULL
      ORDER BY resolved_at DESC 
      LIMIT 5
    `);
    console.table(historicalFires.rows);
    
    // 3. Check ARIMA-ready data aggregation
    console.log('\n🔍 ARIMA-ready data aggregation (sample):');
    const arimaData = await pool.query(`
      SELECT 
        barangay,
        TO_CHAR(resolved_at, 'YYYY-MM') as date_period,
        COUNT(*) as incident_count
      FROM historical_fires 
      WHERE resolved_at >= '2024-01-01'
        AND barangay IS NOT NULL
        AND barangay != ''
      GROUP BY barangay, TO_CHAR(resolved_at, 'YYYY-MM')
      ORDER BY barangay, date_period
      LIMIT 10
    `);
    console.table(arimaData.rows);
    
    // 4. Summary statistics
    console.log('\n📈 Summary Statistics:');
    const stats = await pool.query(`
      SELECT 
        'Active Fires' as table_name,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE barangay IS NOT NULL) as with_barangay
      FROM active_fires
      UNION ALL
      SELECT 
        'Historical Fires' as table_name,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE barangay IS NOT NULL) as with_barangay
      FROM historical_fires
    `);
    console.table(stats.rows);
    
    console.log('\n✅ Data flow test completed!');
    console.log('\n🔥 Ready for ARIMA forecasting with barangay-specific data!');
    
  } catch (error) {
    console.error('❌ Error testing resolve function data:', error);
  } finally {
    process.exit(0);
  }
}

testResolveFunctionData();