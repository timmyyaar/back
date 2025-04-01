const { Pool } = require("pg");

const env = require("../helpers/environments");

const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

const poolConfig = {
  connectionString: POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 1,
  keepAlive: false,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 5000,
};

let pool = new Pool(poolConfig);

pool.on("error", async (err) => {
  console.error("Unexpected error on idle client", err);
  if (
    err.code === "PROTOCOL_CONNECTION_LOST" ||
    err.code === "CONNECTION_TERMINATED"
  ) {
    console.log("Connection lost. Attempting to reconnect...");
    try {
      await pool.end();
      pool = new Pool(poolConfig);
    } catch (reconnectError) {
      console.error("Failed to reconnect:", reconnectError);
    }
  }
});

pool.on("connect", (client) => {
  client.on("error", (err) => {
    console.error("Database client error:", err);
  });
});

module.exports = pool;
