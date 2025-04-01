const { Pool } = require("pg");

const env = require("../helpers/environments");

const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

const pool = new Pool({
  connectionString: POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  max: 20,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  // Attempt to reconnect on errors
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Attempting to reconnect to database...');
  }
});

// Add connection validation
pool.on("connect", (client) => {
  client.on("error", (err) => {
    console.error("Database client error:", err);
  });
});

module.exports = pool;
