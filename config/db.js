// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
let pool;

// If a canonical DATABASE_URL is present (e.g., Render), use it. Otherwise, construct one
// from individual DB_* env vars so both modes are supported.
let connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER) {
  const user = encodeURIComponent(process.env.DB_USER);
  const pass = process.env.DB_PASSWORD ? encodeURIComponent(process.env.DB_PASSWORD) : '';
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '5432';
  const name = process.env.DB_NAME;
  // Build a basic connection string from individual DB_* vars.
  // Do NOT force `sslmode=require` for local development. Only append it when
  // DB_SSL is explicitly true or the host looks like a managed provider.
  connectionString = `postgresql://${user}:${pass}@${host}:${port}/${name}`;
  const hostLooksLikeManagedFromEnv = /render\.com/.test(host);
  if (process.env.DB_SSL === 'true' || hostLooksLikeManagedFromEnv) {
    connectionString += '?sslmode=require';
  }
}

if (connectionString) {
  // Determine whether SSL is required. Render Postgres requires SSL; some
  // connection strings include ?sslmode=require. Also allow an explicit
  // DB_SSL env var or detect common managed hosts.
  const connectionStringRequiresSSL = /sslmode=require|ssl=true/i.test(connectionString);
  const hostLooksLikeManaged = (process.env.DB_HOST && /render\.com/.test(process.env.DB_HOST));
  const useSSL = connectionStringRequiresSSL || isProduction || process.env.DB_SSL === 'true' || hostLooksLikeManaged;

  pool = new Pool({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
  });
} else {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bfpmapping',
    // coerce password to string to avoid non-string types causing SASL errors
    password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
    port: Number.isFinite(Number(process.env.DB_PORT)) ? parseInt(process.env.DB_PORT, 10) : 5432,
    // If DB_HOST looks like a managed provider that requires SSL, enable it.
    ssl: (process.env.DB_SSL === 'true' || (process.env.DB_HOST && /render\.com/.test(process.env.DB_HOST))) ? { rejectUnauthorized: false } : false,
  });
}

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch((err) => console.error('❌ PostgreSQL connection error:', err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
 
