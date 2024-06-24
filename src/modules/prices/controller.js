const pool = require("../../db/pool");

const constants = require("../../constants");

const PricesController = () => {
  const getPrices = async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM prices");

      return res.json(rows);
    } catch (error) {
      return res.status(500).json({ error });
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
        prices.map(
          async ({ key, price }) =>
            await pool.query("UPDATE prices SET price = $2 WHERE key = $1", [
              key,
              price,
            ]),
        ),
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
