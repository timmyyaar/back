const { Client } = require("pg");

const constants = require("../../constants");

const env = require("../../helpers/environments");

const PricesController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const getPrices = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();

      const result = await client.query("SELECT * FROM prices");

      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const updatePrice = async (req, res) => {
    const client = getClient();

    const isAdmin = req.role === constants.ROLES.ADMIN;

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    const { prices } = req.body;

    if (
      prices.some(
        ({ price }) => (!price && price !== 0) || typeof price !== "number"
      )
    ) {
      return res.status(400).json({ message: "Incorrect price!" });
    }

    try {
      await client.connect();

      await Promise.all(
        prices.map(
          async ({ key, price }) =>
            await client.query("UPDATE prices SET price = $2 WHERE key = $1", [
              key,
              price,
            ])
        )
      );

      return res.json({ message: "Prices have been updated!" });
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  return {
    getPrices,
    updatePrice,
  };
};

module.exports = PricesController();
