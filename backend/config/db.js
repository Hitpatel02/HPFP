const { Pool } = require('pg');
require('dotenv').config();

// Create a database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual connection parameters if DATABASE_URL is not provided
  user: process.env.PGUSER || process.env.DB_USER,
  host: process.env.PGHOST || process.env.DB_HOST,
  database: process.env.PGDATABASE || process.env.DB_NAME,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  port: process.env.PGPORT || process.env.DB_PORT,
});

// Export the query method for easier use
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool
};
