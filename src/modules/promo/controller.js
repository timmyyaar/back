const { Client } = require("pg");

const env = require("../../helpers/environments");

const PromoController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const getAllPromo = async (_, res) => {
    const client = getClient();

    try {
      await client.connect();
      const result = await client.query("SELECT * FROM promo ORDER BY id DESC");

      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const getPromoByCode = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();
      const { code } = req.params;
      const result = await client.query("SELECT * FROM promo WHERE code = $1", [
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
    } finally {
      await client.end();
    }
  };

  const createPromo = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();

      const { code, author, sale, count } = req.body;

      const existingPromoQuery = await client.query(
        "SELECT * FROM promo WHERE code = $1",
        [code]
      );
      const existingPromo = existingPromoQuery.rows[0];

      if (existingPromo) {
        return res.status(409).json({ message: "Promo already exists!" });
      }

      const result = await client.query(
        "INSERT INTO promo (code, author, sale, count) VALUES ($1, $2, $3, $4) RETURNING *",
        [code, author, sale, count]
      );

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const deletePromo = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();
      const { id } = req.params;
      const result = await client.query(
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
    } finally {
      await client.end();
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
