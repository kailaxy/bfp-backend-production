#!/usr/bin/env node

/**
 * Analyze historical fire data to understand patterns for better fallback forecasts
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function analyzeHistoricalData() {
  try {
    console.log('🔍 Analyzing historical fire data patterns...');
    
    // Get historical fire counts by barangay and month
    const historicalQuery = `
      SELECT 
        barangay_name,
        EXTRACT(MONTH FROM date_reported) as month,
        COUNT(*) as fire_count
      FROM historical_fires 
      WHERE date_reported IS NOT NULL
      GROUP BY barangay_name, EXTRACT(MONTH FROM date_reported)
      ORDER BY barangay_name, month;
    `;
    
    const result = await pool.query(historicalQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ No historical fire data found!');
      return;
    }
    
    console.log(`📊 Found ${result.rows.length} barangay-month combinations with fire data`);
    
    // Analyze patterns
    const barangayStats = {};
    const monthlyStats = {};
    
    result.rows.forEach(row => {
      const { barangay_name, month, fire_count } = row;
      
      // Track barangay statistics
      if (!barangayStats[barangay_name]) {
        barangayStats[barangay_name] = { total: 0, months: 0, avg: 0 };
      }
      barangayStats[barangay_name].total += parseInt(fire_count);
      barangayStats[barangay_name].months += 1;
      
      // Track monthly statistics
      if (!monthlyStats[month]) {
        monthlyStats[month] = { total: 0, count: 0, avg: 0 };
      }
      monthlyStats[month].total += parseInt(fire_count);
      monthlyStats[month].count += 1;
    });
    
    // Calculate averages
    Object.keys(barangayStats).forEach(barangay => {
      barangayStats[barangay].avg = barangayStats[barangay].total / barangayStats[barangay].months;
    });
    
    Object.keys(monthlyStats).forEach(month => {
      monthlyStats[month].avg = monthlyStats[month].total / monthlyStats[month].count;
    });
    
    // Show top 10 highest risk barangays
    console.log('\n🔥 Top 10 Highest Risk Barangays (by average fires per month):');
    const topBarangays = Object.entries(barangayStats)
      .sort(([,a], [,b]) => b.avg - a.avg)
      .slice(0, 10);
    
    topBarangays.forEach(([name, stats], index) => {
      console.log(`${index + 1}. ${name}: ${stats.avg.toFixed(2)} avg fires/month (${stats.total} total in ${stats.months} months)`);
    });
    
    // Show monthly patterns
    console.log('\n📅 Monthly Fire Patterns:');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    Object.entries(monthlyStats)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([month, stats]) => {
        console.log(`${monthNames[month-1]}: ${stats.avg.toFixed(2)} avg fires per barangay`);
      });
    
    // Show dry season vs wet season
    const drySeason = [11, 12, 1, 2, 3, 4]; // Nov-Apr
    const wetSeason = [5, 6, 7, 8, 9, 10]; // May-Oct
    
    const drySeasonAvg = Object.entries(monthlyStats)
      .filter(([month]) => drySeason.includes(parseInt(month)))
      .reduce((sum, [, stats]) => sum + stats.avg, 0) / 6;
      
    const wetSeasonAvg = Object.entries(monthlyStats)
      .filter(([month]) => wetSeason.includes(parseInt(month)))
      .reduce((sum, [, stats]) => sum + stats.avg, 0) / 6;
    
    console.log(`\n🌡️ Seasonal Patterns:`);
    console.log(`Dry Season (Nov-Apr): ${drySeasonAvg.toFixed(2)} avg fires per barangay`);
    console.log(`Wet Season (May-Oct): ${wetSeasonAvg.toFixed(2)} avg fires per barangay`);
    console.log(`Dry/Wet Ratio: ${(drySeasonAvg / wetSeasonAvg).toFixed(2)}x higher in dry season`);
    
    // Return data for improved forecasting
    return {
      barangayStats,
      monthlyStats,
      drySeasonAvg,
      wetSeasonAvg,
      totalRecords: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error analyzing historical data:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeHistoricalData();