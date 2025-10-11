// Clear all forecasts from the database
const db = require('./config/db');

async function clearForecasts() {
  try {
    console.log('🗑️  Clearing forecasts table...');
    const result = await db.query('DELETE FROM forecasts');
    console.log(`✅ Cleared ${result.rowCount} forecast records`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing forecasts:', error);
    process.exit(1);
  }
}

clearForecasts();
