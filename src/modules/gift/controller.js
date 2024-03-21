const { Client } = require("pg");

const env = require("../../helpers/environments");

const GiftController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const getGift = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();
      const result = await client.query("SELECT * FROM gift");

      res.json({ gift: result.rows });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const createGift = async (req, res) => {
    const client = getClient();

    try {
      const { email, phone, comment } = req.body;
      if (email && phone && comment) {
        await client.connect();

        const result = await client.query(
          "INSERT INTO gift(email, phone, comment) VALUES($1, $2, $3) RETURNING *",
          [email, phone, comment]
        );

        res.status(200).json({ gift: result.rows[0] });
      } else {
        res.status(422).json({ message: "Unprocessable Entity" });
      }
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const deleteGift = async (req, res) => {
    const client = getClient();

    try {
      const { id } = req.body;
      await client.connect();

      const result = await client.query(
        "DELETE FROM gift WHERE id = $1 RETURNING *",
        [id]
      );

      res.status(200).json({ message: "Gift deleted", gift: result.rows });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  return {
    getGift,
    createGift,
    deleteGift,
  };
};

module.exports = GiftController();
