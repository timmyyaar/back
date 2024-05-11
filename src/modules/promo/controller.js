const pool = require("../../db/pool");

const PromoController = () => {
  const getAllPromo = async (_, res) => {
    try {
      const result = await pool.query("SELECT * FROM promo ORDER BY id DESC");

      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const getPromoByCode = async (req, res) => {
    try {
      const { code } = req.params;
      const result = await pool.query("SELECT * FROM promo WHERE code = $1", [
        code,
      ]);
      const promo = result.rows[0];

      if (!promo) {
        return res.status(404).json({ message: "Promo not found" });
      } else if (promo.count && promo.count_used >= promo.count) {
        return res.status(410).json({ message: "Promo expired" });
      } else {
        return res.status(200).json({ promo });
      }
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const createPromo = async (req, res) => {
    try {
      const { code, author, sale, count } = req.body;

      const existingPromoQuery = await pool.query(
        "SELECT * FROM promo WHERE code = $1",
        [code]
      );
      const existingPromo = existingPromoQuery.rows[0];

      if (existingPromo) {
        return res.status(409).json({ message: "Promo already exists!" });
      }

      const result = await pool.query(
        "INSERT INTO promo (code, author, sale, count) VALUES ($1, $2, $3, $4) RETURNING *",
        [code, author, sale, count]
      );

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const deletePromo = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "DELETE FROM promo WHERE id = $1 RETURNING *",
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Promo not found" });
      } else {
        res.status(200).json({ message: "Promo deleted successfully" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  return {
    getAllPromo,
    getPromoByCode,
    createPromo,
    deletePromo,
  };
};

module.exports = PromoController();
