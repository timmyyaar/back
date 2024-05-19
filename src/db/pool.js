const { Pool } = require("pg");

const env = require("../helpers/environments");

const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

const pool = new Pool({
  connectionString: `${POSTGRES_URL}?sslmode=require`,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 0,
  createTimeoutMillis: 0,
  acquireTimeoutMillis: 0,
  keepAlive: true,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);

  process.exit(-1);
});

module.exports = pool;
