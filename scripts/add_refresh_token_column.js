// Script to add refresh_token column to users table
require('dotenv').config();
const pool = require('../config/db');

async function addRefreshTokenColumn() {
  try {
    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'refresh_token'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ refresh_token column already exists');
      return;
    }

    // Add the column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN refresh_token TEXT
    `);

    console.log('✅ Successfully added refresh_token column to users table');
  } catch (error) {
    console.error('❌ Error adding refresh_token column:', error.message);
  } finally {
    process.exit(0);
  }
}

addRefreshTokenColumn();