const pool = require('../config/db');

/**
 * ARIMA Data Extraction Service
 * 
 * This service focuses ONLY on the data needed for ARIMA forecasting:
 * - Barangay (location identifier)
 * - Date (year & month for time series)
 * - Incident Count (the value to predict)
 * 
 * All other columns (lat, lng, casualties, damage, etc.) are optional
 * and don't affect the forecasting algorithm.
 */

class ARIMADataService {
  
  /**
   * Extract ONLY the essential data needed for ARIMA forecasting
   * Returns: Barangay, Year-Month, Incident Count
   */
  async getARIMAEssentialData(startYear = 2010, endYear = 2024) {
    try {
      console.log('🎯 Extracting ESSENTIAL data for ARIMA forecasting...');
      console.log('📊 Required fields: Barangay, Year-Month, Incident Count');
      console.log('⚠️ Optional fields: Everything else (lat, lng, casualties, damage, etc.)');
      
      const query = `
        SELECT 
          barangay,
          TO_CHAR(resolved_at, 'YYYY-MM') as date_period,
          COUNT(*) as incident_count
        FROM historical_fires 
        WHERE resolved_at >= $1::date 
          AND resolved_at < $2::date
          AND barangay IS NOT NULL
          AND barangay != ''
        GROUP BY barangay, TO_CHAR(resolved_at, 'YYYY-MM')
        ORDER BY barangay, date_period
      `;
      
      const result = await pool.query(query, [
        `${startYear}-01-01`,
        `${endYear + 1}-01-01`
      ]);
      
      console.log(`✅ Extracted ${result.rows.length} data points for ARIMA`);
      console.log(`📈 Covering ${new Set(result.rows.map(r => r.barangay)).size} barangays`);
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error extracting ARIMA essential data:', error);
      return [];
    }
  }
  
  /**
   * Show data quality report - what we have vs what ARIMA needs
   */
  async getDataQualityReport() {
    try {
      console.log('\n📋 DATA QUALITY REPORT FOR ARIMA FORECASTING\n');
      
      // Essential fields check
      console.log('🎯 ESSENTIAL FIELDS (Required for ARIMA):');
      
      const barangayCheck = await pool.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(*) FILTER (WHERE barangay IS NOT NULL AND barangay != '') as with_barangay,
          COUNT(DISTINCT barangay) as unique_barangays
        FROM historical_fires
      `);
      
      const dateCheck = await pool.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as with_date,
          MIN(resolved_at) as earliest_date,
          MAX(resolved_at) as latest_date
        FROM historical_fires
      `);
      
      console.log('   ✅ Barangay Data:');
      console.table(barangayCheck.rows);
      
      console.log('   ✅ Date Data:');
      console.table(dateCheck.rows);
      
      // Optional fields check
      console.log('\n📝 OPTIONAL FIELDS (Not needed for ARIMA):');
      
      const optionalCheck = await pool.query(`
        SELECT 
          'Location Data' as field_category,
          COUNT(*) FILTER (WHERE lat IS NOT NULL) as with_lat,
          COUNT(*) FILTER (WHERE lng IS NOT NULL) as with_lng,
          COUNT(*) FILTER (WHERE address IS NOT NULL) as with_address
        FROM historical_fires
        UNION ALL
        SELECT 
          'Incident Details' as field_category,
          COUNT(*) FILTER (WHERE casualties IS NOT NULL) as casualties,
          COUNT(*) FILTER (WHERE injuries IS NOT NULL) as injuries,
          COUNT(*) FILTER (WHERE estimated_damage IS NOT NULL) as damage
        FROM historical_fires
        UNION ALL
        SELECT 
          'Administrative' as field_category,
          COUNT(*) FILTER (WHERE alarm_level IS NOT NULL) as alarm_level,
          COUNT(*) FILTER (WHERE reported_by IS NOT NULL) as reported_by,
          COUNT(*) FILTER (WHERE cause IS NOT NULL) as cause
        FROM historical_fires
      `);
      
      console.table(optionalCheck.rows);
      
      // ARIMA readiness summary
      console.log('\n🚀 ARIMA FORECASTING READINESS:');
      
      const arimaReadiness = await pool.query(`
        SELECT 
          'ARIMA Ready Records' as status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM historical_fires), 2) as percentage
        FROM historical_fires 
        WHERE barangay IS NOT NULL 
          AND barangay != ''
          AND resolved_at IS NOT NULL
      `);
      
      console.table(arimaReadiness.rows);
      
      console.log('\n💡 Summary:');
      console.log('   • ARIMA only needs: Barangay + Date + Count');
      console.log('   • Missing lat/lng/casualties/damage = NOT a problem');
      console.log('   • Focus on data quality for Barangay and Date fields');
      console.log('   • Everything else is bonus data for reports/analytics');
      
    } catch (error) {
      console.error('❌ Error generating data quality report:', error);
    }
  }
  
  /**
   * Export ARIMA-ready data to CSV (same format as your prediction.csv)
   */
  async exportForARIMA(outputPath = null) {
    try {
      const data = await this.getARIMAEssentialData();
      
      if (data.length === 0) {
        console.log('⚠️ No ARIMA data to export');
        return null;
      }
      
      // Generate CSV content
      const csvHeader = 'BARANGAY,DATE_PERIOD,INCIDENT_COUNT\n';
      const csvRows = data.map(row => 
        `${row.barangay},${row.date_period},${row.incident_count}`
      ).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      if (outputPath) {
        require('fs').writeFileSync(outputPath, csvContent);
        console.log(`✅ ARIMA data exported to: ${outputPath}`);
      } else {
        console.log('\n📄 ARIMA-READY CSV DATA:');
        console.log(csvContent.substring(0, 500) + '...');
      }
      
      return csvContent;
      
    } catch (error) {
      console.error('❌ Error exporting ARIMA data:', error);
      return null;
    }
  }
}

// Demo usage
async function demonstrateARIMAFocus() {
  const arimaService = new ARIMADataService();
  
  // Show data quality report
  await arimaService.getDataQualityReport();
  
  // Show sample ARIMA data
  console.log('\n📊 SAMPLE ARIMA DATA (First 10 records):');
  const arimaData = await arimaService.getARIMAEssentialData();
  console.table(arimaData.slice(0, 10));
  
  console.log('\n🎯 KEY TAKEAWAY:');
  console.log('   • For ARIMA: Only Barangay + Date + Count matters');
  console.log('   • Missing other fields = No problem for forecasting');
  console.log('   • Focus on getting clean Barangay and Date data');
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  demonstrateARIMAFocus();
}

module.exports = ARIMADataService;