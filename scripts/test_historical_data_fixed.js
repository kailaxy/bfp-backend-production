const db = require('../db');

async function testHistoricalDataFetch() {
  try {
    console.log('Testing historical data fetch from historical_fires table...');
    
    // Test the query directly
    const query = `
      SELECT 
        barangay,
        DATE_TRUNC('month', resolved_at) as month_date,
        COUNT(*) as incident_count
      FROM historical_fires 
      WHERE resolved_at >= NOW() - INTERVAL '15 years'
        AND barangay IS NOT NULL
        AND resolved_at IS NOT NULL
      GROUP BY barangay, DATE_TRUNC('month', resolved_at)
      ORDER BY barangay, month_date
    `;
    
    const result = await db.query(query);
    const data = result.rows.map(row => ({
      barangay: row.barangay,
      date: row.month_date.toISOString().substring(0, 7), // YYYY-MM format
      incident_count: parseInt(row.incident_count)
    }));
    
    console.log('\n📊 Fetched Historical Data:');
    console.log(`Total records: ${data.length}`);
    
    if (data.length > 0) {
      console.log('\nSample records:');
      data.slice(0, 10).forEach(record => {
        console.log(`  ${record.barangay} - ${record.date}: ${record.incident_count} incidents`);
      });
      
      // Group by barangay to show coverage
      const barangayCounts = {};
      data.forEach(record => {
        if (!barangayCounts[record.barangay]) {
          barangayCounts[record.barangay] = 0;
        }
        barangayCounts[record.barangay] += record.incident_count;
      });
      
      console.log('\n📈 Data by Barangay:');
      Object.entries(barangayCounts).forEach(([barangay, total]) => {
        const months = data.filter(d => d.barangay === barangay).length;
        console.log(`  ${barangay}: ${total} total incidents across ${months} months`);
      });
    } else {
      console.log('No historical data found.');
    }
    
  } catch (error) {
    console.error('❌ Error testing historical data fetch:', error);
  } finally {
    process.exit(0);
  }
}

testHistoricalDataFetch();