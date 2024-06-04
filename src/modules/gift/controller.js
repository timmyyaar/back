const { sql } = require("@vercel/postgres");

const GiftController = () => {
  const getGift = async (req, res) => {
    try {
      const result = await sql`SELECT * FROM gift`;

      res.json({ gift: result.rows });
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const createGift = async (req, res) => {
    try {
      const { email = "", phone = "", comment = "" } = req.body;

      const result =
        await sql`INSERT INTO gift(email, phone, comment) VALUES(${email}, ${phone},
          ${comment}) RETURNING *`;

      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const deleteGift = async (req, res) => {
    try {
      const { id } = req.body;

      const result = await sql`DELETE FROM gift WHERE id = ${id} RETURNING *`;

      res.status(200).json({ message: "Gift deleted", gift: result.rows });
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  return {
    getGift,
    createGift,
    deleteGift,
  };
};

module.exports = GiftController();
