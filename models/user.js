const db = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

async function createUser({ username, password, email, role, station_id = null }) {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const sql = `
    INSERT INTO users (username, password_hash, email, role, station_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, username, email, role, station_id, created_at
  `;
  const params = [username, password_hash, email, role, station_id];
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function findByUsername(username) {
  const sql = `SELECT * FROM users WHERE username = $1`;
  const { rows } = await db.query(sql, [username]);
  return rows[0];
}

async function validatePassword(username, password) {
  const user = await findByUsername(username);
  if (!user) return false;
  return await bcrypt.compare(password, user.password_hash) ? user : false;
}

module.exports = {
  createUser,
  findByUsername,
  validatePassword,
};