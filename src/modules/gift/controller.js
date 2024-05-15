const pool = require("../../db/pool");

const GiftController = () => {
  const getGift = async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM gift");

      res.json({ gift: result.rows });
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const createGift = async (req, res) => {
    try {
      const { email = "", phone = "", comment = "" } = req.body;

      const result = await pool.query(
        "INSERT INTO gift(email, phone, comment) VALUES($1, $2, $3) RETURNING *",
        [email, phone, comment]
      );

      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const deleteGift = async (req, res) => {
    try {
      const { id } = req.body;

      const result = await pool.query(
        "DELETE FROM gift WHERE id = $1 RETURNING *",
        [id]
      );

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
