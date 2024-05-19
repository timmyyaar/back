const { Pool } = require("pg");

const env = require("../helpers/environments");

const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

const pool = new Pool({
  connectionString: `${POSTGRES_URL}?sslmode=require`,
  idleTimeoutMillis: 50000,
  connectionTimeoutMillis: 50000,
  createTimeoutMillis: 50000,
  acquireTimeoutMillis: 50000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);

  process.exit(-1);
});

module.exports = pool;
