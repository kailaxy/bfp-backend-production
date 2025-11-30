const db = require('./config/db');
const fs = require('fs').promises;
const path = require('path');

async function exportToColabFormat() {
  try {
    console.log('🔍 Extracting historical data from production database...\n');
    
    // Query to aggregate historical fires by barangay and month
    // Same query used by the forecasting service
    const query = `
      SELECT 
        barangay AS barangay_name,
        TO_CHAR(DATE_TRUNC('month', resolved_at), 'YYYY-MM') AS month_date,
        COUNT(*) AS incident_count
      FROM historical_fires
      WHERE resolved_at IS NOT NULL
      GROUP BY barangay, DATE_TRUNC('month', resolved_at)
      ORDER BY barangay, DATE_TRUNC('month', resolved_at)
    `;
    
    const result = await db.pool.query(query);
    
    console.log(`📊 Total records extracted: ${result.rows.length}`);
    
    // Group by barangay to show summary
    const barangayStats = {};
    result.rows.forEach(row => {
      if (!barangayStats[row.barangay_name]) {
        barangayStats[row.barangay_name] = {
          count: 0,
          firstDate: row.month_date,
          lastDate: row.month_date,
          totalIncidents: 0
        };
      }
      barangayStats[row.barangay_name].count++;
      barangayStats[row.barangay_name].totalIncidents += parseInt(row.incident_count);
      if (row.month_date > barangayStats[row.barangay_name].lastDate) {
        barangayStats[row.barangay_name].lastDate = row.month_date;
      }
      if (row.month_date < barangayStats[row.barangay_name].firstDate) {
        barangayStats[row.barangay_name].firstDate = row.month_date;
      }
    });
    
    console.log('\n📋 Barangay Data Summary:');
    console.log('─'.repeat(90));
    console.log('Barangay                  | Records | First Date | Last Date  | Total Incidents');
    console.log('─'.repeat(90));
    Object.entries(barangayStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([barangay, stats]) => {
        console.log(
          `${barangay.padEnd(25)} | ${stats.count.toString().padStart(7)} | ${stats.firstDate} | ${stats.lastDate} | ${stats.totalIncidents.toString().padStart(15)}`
        );
      });
    console.log('─'.repeat(90));
    
    // Find the most recent date across all barangays
    const mostRecentDate = result.rows.reduce((latest, row) => {
      return row.month_date > latest ? row.month_date : latest;
    }, '2000-01');
    
    console.log(`\n🗓️  Most recent data: ${mostRecentDate}`);
    console.log(`📊 Total barangays: ${Object.keys(barangayStats).length}`);
    
    // Create CSV content in exact same format as datatoforecasts.csv
    // Format: barangay_name,YYYY-MM,incident_count (no header)
    const csvRows = result.rows.map(row => 
      `${row.barangay_name},${row.month_date},${row.incident_count}`
    ).join('\n');
    
    // Save to file
    const outputPath = path.join(__dirname, '..', 'production_data_for_colab.csv');
    await fs.writeFile(outputPath, csvRows, 'utf8');
    
    console.log(`\n✅ Exported to: ${outputPath}`);
    console.log(`\n📝 File format: barangay_name,YYYY-MM,incident_count (no header)`);
    console.log(`   This matches the format of datatoforecasts.csv`);
    console.log(`\n🚀 Next steps:`);
    console.log(`   1. Upload production_data_for_colab.csv to your Google Colab`);
    console.log(`   2. Replace datatoforecasts.csv with this file`);
    console.log(`   3. Run the ARIMA forecasting notebook`);
    console.log(`   4. Compare the results with production forecasts`);
    
    // Show sample of Addition Hills data for verification
    console.log(`\n🔍 Addition Hills sample (last 10 records):`);
    const additionHillsRecords = result.rows
      .filter(r => r.barangay_name === 'Addition Hills')
      .slice(-10);
    
    additionHillsRecords.forEach(r => {
      console.log(`   ${r.month_date}: ${r.incident_count} incidents`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

exportToColabFormat();
