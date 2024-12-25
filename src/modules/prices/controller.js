const pool = require("../../db/pool");

const constants = require("../../constants");

const PricesController = () => {
  let retriesCount = 0;

  const getPrices = async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM prices");

      retriesCount = 0;

      return res.json(rows);
    } catch (error) {
      if (retriesCount < constants.DEFAULT_RETRIES_COUNT) {
        retriesCount++;

        setTimeout(
          async () => await getPrices(req, res),
          constants.DEFAULT_RETRIES_DELAY,
        );
      } else {
        return res.status(500).json({ error });
      }
    }
  };

  const updatePrice = async (req, res) => {
    const isAdmin = [
      constants.ROLES.ADMIN,
      constants.ROLES.SUPERVISOR,
    ].includes(req.role);

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    const { prices } = req.body;

    if (
      prices.some(
        ({ price }) => (!price && price !== 0) || typeof price !== "number",
      )
    ) {
      return res.status(400).json({ message: "Incorrect price!" });
    }

    try {
      await Promise.all(
        prices.map(async ({ key, price, city }) => {
          const {
            rows: [existingPrice],
          } = await pool.query(
            "SELECT * FROM prices WHERE key = $1 AND city = $2",
            [key, city || 'Krakow'],
          );

          await pool.query(
            existingPrice
              ? "UPDATE prices SET price = $1 WHERE key = $2 AND city = $3"
              : "INSERT INTO prices (price, key, city) VALUES ($1, $2, $3)",
            [price, key, city || 'Krakow'],
          );
        }),
      );

      return res.json({ message: "Prices have been updated!" });
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  return {
    getPrices,
    updatePrice,
  };
};

module.exports = PricesController();
