const { Pool } = require("pg");

const env = require("../helpers/environments");

const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

const pool = new Pool({
  connectionString: POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

module.exports = pool;
