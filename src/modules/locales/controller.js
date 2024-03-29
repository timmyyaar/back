const { Client } = require("pg");

const constants = require("../../constants");

const env = require("../../helpers/environments");

const LocalesController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const getLocales = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();
      const result = await client.query("SELECT * FROM locales");

      res.json({ locales: result.rows });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const createNewLocale = async (req, res) => {
    const client = getClient();

    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { key, english, polish, russian, ukrainian } = req.body;

      if (key && english && polish && russian && ukrainian) {
        await client.connect();

        const localeExists = await client.query(
          "SELECT * FROM locales WHERE key = $1",
          [key]
        );

        if (localeExists.rowCount > 0) {
          res.status(409).json({ message: "Locale already exists" });
        } else {
          const result = await client.query(
            `INSERT INTO locales (key, value, locale) VALUES ($1, $2, $6), 
             ($1, $3, $7), ($1, $4, $8), ($1, $5, $9) RETURNING *`,
            [key, english, polish, russian, ukrainian, "en", "pl", "ru", "uk"]
          );

          res.status(200).json(result.rows);
        }
      } else {
        res.status(422).json({ message: "Unprocessable Entity" });
      }
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const editOldLocale = async (req, res) => {
    const client = getClient();

    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { key, value, locale } = req.body;

      if (key && value && locale) {
        await client.connect();

        const localeExists = await client.query(
          "SELECT * FROM locales WHERE key = $1 AND locale = $2",
          [key, locale]
        );

        if (localeExists.rowCount === 0) {
          res.status(404).json({ message: "Locale not found" });
        } else {
          const result = await client.query(
            "UPDATE locales SET value = $1 WHERE key = $2 AND locale = $3 RETURNING *",
            [value, key, locale]
          );

          res.status(200).json({ locale: result.rows[0] });
        }
      } else {
        res.status(422).json({ message: "Unprocessable Entity" });
      }
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const deleteLocale = async (req, res) => {
    const client = getClient();

    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { key } = req.body;

      await client.connect();
      const result = await client.query(
        "DELETE FROM locales WHERE key = $1 RETURNING *",
        [key]
      );

      res
        .status(200)
        .json({ message: "Locales deleted", locales: result.rows });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  return {
    getLocales,
    createNewLocale,
    editOldLocale,
    deleteLocale,
  };
};

module.exports = LocalesController();
