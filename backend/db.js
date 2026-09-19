const { Pool } = require('pg');
require('dotenv').config();

// `max` was previously left unset, which silently falls back to pg's
// built-in default of 10 -- fine for light traffic, but every route in
// this app (chat included) shares this one pool, so it's worth being
// explicit and tunable rather than relying on an implicit library
// default. 10 is kept as the default here (safe on any free-tier
// Postgres instance, which typically caps total connections well under
// 100) but can be raised via DB_POOL_MAX if the host allows more.
// idleTimeoutMillis/connectionTimeoutMillis avoid two failure modes seen
// under bursty chat traffic: connections sitting open indefinitely, and
// a request hanging forever instead of failing fast when the pool is
// exhausted.
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_POOL_CONN_TIMEOUT_MS) || 5000,
});

module.exports = pool;