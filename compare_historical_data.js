const db = require('./config/db');
const fs = require('fs').promises;
const path = require('path');

async function extractHistoricalData() {
  try {
    console.log('🔍 Extracting historical data from database...\n');
    
    // Query to aggregate historical fires by barangay and month (same as forecastingService)
    const query = `
      SELECT 
        barangay AS barangay_name,
        DATE_TRUNC('month', resolved_at)::date AS month_date,
        COUNT(*) AS incident_count
      FROM historical_fires
      WHERE resolved_at IS NOT NULL
      GROUP BY barangay, DATE_TRUNC('month', resolved_at)
      ORDER BY barangay, month_date
    `;
    
    const result = await db.pool.query(query);
    
    console.log(`📊 Total records from database: ${result.rows.length}`);
    
    // Group by barangay to show summary
    const barangayStats = {};
    result.rows.forEach(row => {
      if (!barangayStats[row.barangay_name]) {
        barangayStats[row.barangay_name] = {
          count: 0,
          firstDate: row.month_date,
          lastDate: row.month_date
        };
      }
      barangayStats[row.barangay_name].count++;
      if (row.month_date > barangayStats[row.barangay_name].lastDate) {
        barangayStats[row.barangay_name].lastDate = row.month_date;
      }
    });
    
    console.log('\n📋 Barangay Data Summary:');
    console.log('─'.repeat(80));
    Object.entries(barangayStats).sort().forEach(([barangay, stats]) => {
      console.log(`${barangay.padEnd(25)} | Records: ${stats.count.toString().padStart(3)} | ${stats.firstDate} to ${stats.lastDate}`);
    });
    console.log('─'.repeat(80));
    
    // Find the most recent date across all barangays
    const mostRecentDate = result.rows.reduce((latest, row) => {
      return row.month_date > latest ? row.month_date : latest;
    }, '2000-01-01');
    
    console.log(`\n🗓️  Most recent data: ${mostRecentDate}`);
    
    // Convert to CSV format matching datatoforecasts.csv
    const csvHeader = 'barangay_name,month_date,incident_count\n';
    const csvRows = result.rows.map(row => 
      `${row.barangay_name},${row.month_date},${row.incident_count}`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Save to file
    const outputPath = path.join(__dirname, '..', 'database_historical_data.csv');
    await fs.writeFile(outputPath, csvContent, 'utf8');
    
    console.log(`\n✅ Exported to: ${outputPath}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Compare database_historical_data.csv with datatoforecasts.csv`);
    console.log(`   2. Check if the most recent dates match`);
    console.log(`   3. Check if incident counts match for the same barangay/month`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

extractHistoricalData();
