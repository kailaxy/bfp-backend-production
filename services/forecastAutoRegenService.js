/**
 * Auto-Regenerating Forecast Trigger Service
 * 
 * This service monitors the historical_fires table and automatically
 * regenerates forecasts when new fire incidents are added.
 * 
 * Workflow:
 * 1. Historical fire is added to database
 * 2. Trigger detects new insertion
 * 3. Forecast regeneration is queued
 * 4. Enhanced ARIMA/SARIMAX runs with updated data
 * 5. New forecasts replace old ones in forecasts table
 */

const db = require('../config/db');
const enhancedForecastService = require('./enhancedForecastService');

class ForecastAutoRegenService {
  constructor() {
    this.isRegenerating = false;
    this.regenerationQueue = [];
    this.lastRegenerationTime = null;
    this.minTimeBetweenRegen = 5 * 60 * 1000; // 5 minutes cooldown
  }

  /**
   * Check if regeneration is needed based on new data
   */
  async shouldRegenerate() {
    // Don't regenerate if already in progress
    if (this.isRegenerating) {
      console.log('⏳ Forecast regeneration already in progress, skipping...');
      return false;
    }

    // Cooldown period to prevent too frequent regenerations
    if (this.lastRegenerationTime) {
      const timeSinceLastRegen = Date.now() - this.lastRegenerationTime;
      if (timeSinceLastRegen < this.minTimeBetweenRegen) {
        const waitTime = Math.ceil((this.minTimeBetweenRegen - timeSinceLastRegen) / 1000);
        console.log(`⏸️ Cooldown active, wait ${waitTime}s before next regeneration`);
        return false;
      }
    }

    return true;
  }

  /**
   * Queue a forecast regeneration
   * This is called when a new historical fire is added
   */
  async queueRegeneration(reason = 'New historical fire added') {
    if (!await this.shouldRegenerate()) {
      this.regenerationQueue.push({ reason, timestamp: Date.now() });
      console.log(`📋 Regeneration queued: ${reason}`);
      return { queued: true, reason };
    }

    return await this.triggerRegeneration(reason);
  }

  /**
   * Trigger forecast regeneration
   */
  async triggerRegeneration(reason = 'Manual trigger') {
    if (this.isRegenerating) {
      return { success: false, message: 'Regeneration already in progress' };
    }

    try {
      this.isRegenerating = true;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 FORECAST AUTO-REGENERATION TRIGGERED`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Time: ${new Date().toISOString()}`);
      console.log(`${'='.repeat(60)}\n`);

      // Get count of historical fires for logging
      const countResult = await db.query('SELECT COUNT(*) as total FROM historical_fires');
      const totalFires = parseInt(countResult.rows[0]?.total || 0);
      console.log(`📊 Total historical fires in database: ${totalFires}`);

      // Generate 12 months of forecasts using enhanced ARIMA/SARIMAX
      const result = await enhancedForecastService.generateForecasts({
        forecastMonths: 12,
        targetDate: this.getTargetDate(),
        keepTempFiles: false
      });

      this.lastRegenerationTime = Date.now();

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ FORECAST AUTO-REGENERATION COMPLETE`);
      console.log(`   Duration: ${result.duration}s`);
      console.log(`   Forecasts generated: ${result.forecasts_generated}`);
      console.log(`   Successful barangays: ${result.successful_barangays}/${result.barangays_processed}`);
      console.log(`${'='.repeat(60)}\n`);

      // Process queued regenerations if any
      if (this.regenerationQueue.length > 0) {
        console.log(`📋 Processing ${this.regenerationQueue.length} queued regenerations...`);
        this.regenerationQueue = []; // Clear queue
        setTimeout(() => this.triggerRegeneration('Queued regeneration'), 5000);
      }

      return {
        success: true,
        reason,
        timestamp: new Date().toISOString(),
        ...result
      };

    } catch (error) {
      console.error(`❌ Forecast regeneration failed:`, error);
      return {
        success: false,
        error: error.message,
        reason
      };
    } finally {
      this.isRegenerating = false;
    }
  }

  /**
   * Get target date for forecasts (12 months from now)
   */
  getTargetDate() {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 12, 1);
    return targetDate.toISOString().split('T')[0];
  }

  /**
   * Generate initial forecasts (call this once on system startup)
   */
  async generateInitialForecasts() {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎬 GENERATING INITIAL FORECASTS`);
      console.log(`${'='.repeat(60)}\n`);

      // Check if forecasts already exist
      const existingResult = await db.query(`
        SELECT COUNT(DISTINCT barangay) as barangay_count,
               MIN(forecast_month) as earliest,
               MAX(forecast_month) as latest
        FROM arima_forecasts
      `);

      const existing = existingResult.rows[0];
      const barangayCount = parseInt(existing?.barangay_count || 0);

      if (barangayCount > 0) {
        console.log(`ℹ️ Existing forecasts found:`);
        console.log(`   Barangays: ${barangayCount}`);
        console.log(`   Date range: ${existing.earliest} to ${existing.latest}`);
        console.log(`   Skipping initial generation (use regenerate to update)`);
        return {
          success: true,
          skipped: true,
          reason: 'Forecasts already exist'
        };
      }

      console.log(`📊 No existing forecasts found, generating initial forecasts...`);
      return await this.triggerRegeneration('Initial forecast generation');

    } catch (error) {
      console.error(`❌ Initial forecast generation failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if forecasts are stale and need regeneration
   */
  async checkStaleForecasts() {
    try {
      const result = await db.query(`
        SELECT MAX(generated_at) as last_generated
        FROM arima_forecasts
      `);

      const lastGenerated = result.rows[0]?.last_generated;
      
      if (!lastGenerated) {
        console.log(`⚠️ No forecasts found, regeneration needed`);
        return true;
      }

      const lastGenTime = new Date(lastGenerated).getTime();
      const now = Date.now();
      const daysSinceGeneration = (now - lastGenTime) / (1000 * 60 * 60 * 24);

      console.log(`📅 Last forecast generation: ${new Date(lastGenerated).toISOString()}`);
      console.log(`   Days since: ${daysSinceGeneration.toFixed(1)}`);

      // Regenerate if older than 30 days
      if (daysSinceGeneration > 30) {
        console.log(`⚠️ Forecasts are stale (>30 days old), regeneration recommended`);
        return true;
      }

      return false;

    } catch (error) {
      console.error(`Error checking forecast staleness:`, error);
      return false;
    }
  }

  /**
   * Get regeneration status
   */
  getStatus() {
    return {
      isRegenerating: this.isRegenerating,
      lastRegenerationTime: this.lastRegenerationTime 
        ? new Date(this.lastRegenerationTime).toISOString() 
        : null,
      queuedRegenerations: this.regenerationQueue.length,
      cooldownRemaining: this.lastRegenerationTime
        ? Math.max(0, Math.ceil((this.minTimeBetweenRegen - (Date.now() - this.lastRegenerationTime)) / 1000))
        : 0
    };
  }
}

module.exports = new ForecastAutoRegenService();
