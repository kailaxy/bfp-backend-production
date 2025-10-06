#!/usr/bin/env node

/**
 * Generate realistic forecasts based on ACTUAL historical fire data patterns
 * This replaces random forecasts with data-driven predictions
 */

const db = require('../db');

class HistoricalBasedForecastingService {
  
  /**
   * Generate forecasts based on historical fire patterns from the database
   * Uses actual fire incident data to predict future patterns
   */
  async generateHistoricalBasedForecasts(startYear, startMonth) {
    console.log('📊 Generating forecasts based on actual historical fire data...');
    
    try {
      // Get historical fire data by barangay and month
      const historicalQuery = `
        SELECT 
          barangay_name,
          EXTRACT(MONTH FROM date_reported) as month,
          EXTRACT(YEAR FROM date_reported) as year,
          COUNT(*) as fire_count
        FROM historical_fires 
        WHERE date_reported IS NOT NULL 
          AND barangay_name IS NOT NULL
        GROUP BY barangay_name, EXTRACT(MONTH FROM date_reported), EXTRACT(YEAR FROM date_reported)
        ORDER BY barangay_name, year, month;
      `;
      
      const historicalResult = await db.query(historicalQuery);
      console.log(`📈 Found ${historicalResult.rows.length} historical data points`);
      
      if (historicalResult.rows.length === 0) {
        throw new Error('No historical fire data available for forecasting');
      }
      
      // Calculate barangay averages by month
      const barangayMonthlyAvg = {};
      const overallMonthlyAvg = {};
      
      // Process historical data
      historicalResult.rows.forEach(row => {
        const { barangay_name, month, fire_count } = row;
        const monthKey = parseInt(month);
        
        // Track per barangay per month
        if (!barangayMonthlyAvg[barangay_name]) {
          barangayMonthlyAvg[barangay_name] = {};
        }
        if (!barangayMonthlyAvg[barangay_name][monthKey]) {
          barangayMonthlyAvg[barangay_name][monthKey] = [];
        }
        barangayMonthlyAvg[barangay_name][monthKey].push(parseInt(fire_count));
        
        // Track overall monthly patterns
        if (!overallMonthlyAvg[monthKey]) {
          overallMonthlyAvg[monthKey] = [];
        }
        overallMonthlyAvg[monthKey].push(parseInt(fire_count));
      });
      
      // Calculate averages
      Object.keys(barangayMonthlyAvg).forEach(barangay => {
        Object.keys(barangayMonthlyAvg[barangay]).forEach(month => {
          const values = barangayMonthlyAvg[barangay][month];
          barangayMonthlyAvg[barangay][month] = {
            avg: values.reduce((sum, val) => sum + val, 0) / values.length,
            max: Math.max(...values),
            min: Math.min(...values),
            count: values.length
          };
        });
      });
      
      Object.keys(overallMonthlyAvg).forEach(month => {
        const values = overallMonthlyAvg[month];
        overallMonthlyAvg[month] = values.reduce((sum, val) => sum + val, 0) / values.length;
      });
      
      // Get all barangays
      const barangaysQuery = 'SELECT name FROM barangays ORDER BY name';
      const barangaysResult = await db.query(barangaysQuery);
      const barangays = barangaysResult.rows.map(row => row.name);
      
      console.log(`🏘️ Generating forecasts for ${barangays.length} barangays`);
      
      const allForecasts = [];
      let totalPredictions = 0;
      
      // Generate forecasts for 12 months
      for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
        const currentDate = new Date(startYear, startMonth - 1 + monthOffset, 1);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        console.log(`📅 Forecasting for ${year}-${month.toString().padStart(2, '0')} based on historical patterns`);
        
        for (const barangay of barangays) {
          let predicted = 0;
          let lower = 0;
          let upper = 0;
          
          // Use historical data for this barangay and month if available
          if (barangayMonthlyAvg[barangay] && barangayMonthlyAvg[barangay][month]) {
            const histData = barangayMonthlyAvg[barangay][month];
            predicted = Math.round(histData.avg * 100) / 100; // Round to 2 decimals
            
            // Calculate confidence interval based on historical variance
            const variance = (histData.max - histData.min) / 2;
            lower = Math.max(0, Math.round((predicted - variance * 0.5) * 100) / 100);
            upper = Math.round((predicted + variance * 0.5) * 100) / 100;
            
            console.log(`   📊 ${barangay}: ${predicted} cases (historical avg from ${histData.count} years)`);
          } else {
            // Use overall monthly average for this month if no specific barangay data
            const monthlyAvg = overallMonthlyAvg[month] || 0;
            predicted = Math.round(monthlyAvg * 100) / 100;
            lower = Math.max(0, Math.round((predicted * 0.5) * 100) / 100);
            upper = Math.round((predicted * 1.5) * 100) / 100;
            
            console.log(`   📊 ${barangay}: ${predicted} cases (using monthly average - no specific data)`);
          }
          
          // Determine risk level based on predicted cases
          let riskLevel, riskFlag;
          if (predicted < 0.1) {
            riskLevel = 'Very Low';
            riskFlag = false;
          } else if (predicted < 0.5) {
            riskLevel = 'Low';
            riskFlag = false;
          } else if (predicted < 1.0) {
            riskLevel = 'Low-Moderate';
            riskFlag = false;
          } else if (predicted < 2.0) {
            riskLevel = 'Moderate';
            riskFlag = true;
          } else {
            riskLevel = 'High';
            riskFlag = true;
          }
          
          const forecast = {
            barangay_name: barangay,
            month: month,
            year: year,
            predicted_cases: predicted,
            lower_bound: lower,
            upper_bound: upper,
            risk_level: riskLevel,
            risk_flag: riskFlag,
            created_at: new Date().toISOString()
          };
          
          allForecasts.push(forecast);
          totalPredictions++;
        }
      }
      
      console.log(`✅ Generated ${totalPredictions} historically-based forecasts`);
      
      return {
        all_forecasts: allForecasts,
        total_predictions: totalPredictions,
        barangays_count: barangays.length,
        total_months: 12,
        method: 'historical-based'
      };
      
    } catch (error) {
      console.error('❌ Error generating historical-based forecasts:', error.message);
      throw error;
    }
  }
}

module.exports = HistoricalBasedForecastingService;