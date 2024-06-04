const { sql } = require("@vercel/postgres");

const constants = require("../../constants");

const PricesController = () => {
  const getPrices = async (req, res) => {
    try {
      const { rows } = await sql`SELECT * FROM prices`;

      return res.json(rows);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const updatePrice = async (req, res) => {
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
      await Promise.all(
        prices.map(
          async ({ key, price }) =>
            await sql`UPDATE prices SET price = ${price} WHERE key = ${key}`
        )
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
