/**
 * Forecast Generation Utilities
 * 
 * Helper functions for triggering forecast generation in different scenarios
 */

const forecastAutoRegenService = require('./forecastAutoRegenService');

class ForecastGenerationUtils {
  
  /**
   * Trigger forecast generation after bulk historical data import
   * Use this in import scripts when historical data is added
   * 
   * @param {string} source - Description of data source (e.g., "CSV import", "Manual insert")
   * @param {number} recordCount - Number of records that were imported
   * @returns {Promise<Object>} Generation result
   */
  static async triggerAfterBulkImport(source = "Bulk import", recordCount = 0) {
    try {
      console.log(`📊 Bulk historical data import completed (${source}: ${recordCount} records)`);
      console.log('🔄 Triggering enhanced ARIMA/SARIMAX forecast regeneration...');
      
      const result = await forecastAutoRegenService.queueRegeneration(
        `Bulk import: ${source} (${recordCount} records)`
      );
      
      if (result.success) {
        console.log(`✅ Forecast regeneration completed after ${source}:`, result);
        console.log(`   • Updated forecasts for ${result.successful_barangays} barangays`);
        console.log(`   • Generated ${result.forecasts_generated} predictions`);
      } else if (result.queued) {
        console.log(`📋 Forecast regeneration queued after ${source}`);
      } else {
        console.log(`⚠️ Forecast regeneration failed after ${source}:`, result.message);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Error triggering forecast generation after ${source}:`, error);
      return {
        success: false,
        error: error.message,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Trigger forecast generation after active fire resolution
   * Use this when active fires are moved to historical_fires
   * 
   * @param {string} fireId - ID of the resolved fire
   * @returns {Promise<Object>} Generation result
   */
  static async triggerAfterFireResolution(fireId) {
    try {
      console.log(`🔥 Active fire resolved and moved to historical (ID: ${fireId})`);
      console.log('🔄 Triggering enhanced ARIMA/SARIMAX forecast regeneration...');
      
      const result = await forecastAutoRegenService.queueRegeneration(
        `Fire resolved: ${fireId}`
      );
      
      if (result.success) {
        console.log(`✅ Forecast regeneration completed for resolved fire ${fireId}:`, result);
      } else if (result.queued) {
        console.log(`📋 Forecast regeneration queued for resolved fire ${fireId}`);
      } else {
        console.log(`⚠️ Forecast regeneration failed for resolved fire ${fireId}:`, result.message);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Forecast generation error for resolved fire ${fireId}:`, error);
      return {
        success: false,
        error: error.message,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Check if forecast generation should be triggered based on conditions
   * 
   * @param {Object} options - Configuration options
   * @param {boolean} options.skipIfRecent - Skip if forecasts were generated recently (default: true)
   * @param {number} options.recentThresholdMinutes - Consider forecasts recent if generated within this many minutes (default: 30)
   * @returns {Promise<boolean>} Whether to trigger generation
   */
  static async shouldTriggerGeneration(options = {}) {
    const { 
      skipIfRecent = true, 
      recentThresholdMinutes = 30 
    } = options;

    if (!skipIfRecent) {
      return true;
    }

    try {
      const db = require('../db');
      const query = `
        SELECT MAX(created_at) as latest_generation 
        FROM forecasts 
        WHERE created_at > NOW() - INTERVAL '${recentThresholdMinutes} minutes'
      `;
      
      const result = await db.query(query);
      const latestGeneration = result.rows[0]?.latest_generation;
      
      if (latestGeneration) {
        console.log(`🕒 Forecasts were recently generated at ${latestGeneration}`);
        console.log(`⏭️ Skipping generation (within ${recentThresholdMinutes} minute threshold)`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking recent forecast generation:', error);
      return true; // Default to allowing generation on error
    }
  }

  /**
   * Get forecast generation status and statistics
   * 
   * @returns {Promise<Object>} Status information
   */
  static async getGenerationStatus() {
    try {
      const db = require('../db');
      
      const queries = {
        totalForecasts: 'SELECT COUNT(*) as count FROM forecasts',
        latestGeneration: 'SELECT MAX(created_at) as latest FROM forecasts',
        monthsCovered: 'SELECT COUNT(DISTINCT CONCAT(year, \'-\', month)) as months FROM forecasts',
        barangaysCovered: 'SELECT COUNT(DISTINCT barangay_name) as barangays FROM forecasts'
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await db.query(query);
        results[key] = result.rows[0];
      }

      return {
        totalForecasts: parseInt(results.totalForecasts.count),
        latestGeneration: results.latestGeneration.latest,
        monthsCovered: parseInt(results.monthsCovered.months),
        barangaysCovered: parseInt(results.barangaysCovered.barangays),
        status: 'active'
      };
    } catch (error) {
      console.error('Error getting forecast generation status:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = ForecastGenerationUtils;