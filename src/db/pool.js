const { Pool } = require("pg");

const env = require("../helpers/environments");

const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

const pool = new Pool({
  connectionString: `${POSTGRES_URL}?sslmode=require`,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

module.exports = pool;
