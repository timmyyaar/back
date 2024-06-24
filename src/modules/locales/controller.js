const pool = require("../../db/pool");

const constants = require("../../constants");

const LocalesController = () => {
  const getLocales = async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM locales");

      return res.json({ locales: result.rows });
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const createNewLocale = async (req, res) => {
    if (
      ![constants.ROLES.ADMIN, constants.ROLES.SUPERVISOR].includes(req.role)
    ) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { key, english, polish, russian, ukrainian } = req.body;

      if (key && english && polish && russian && ukrainian) {
        const localeExists = await pool.query(
          "SELECT * FROM locales WHERE key = $1",
          [key],
        );

        if (localeExists.rowCount > 0) {
          res.status(409).json({ message: "Locale already exists" });
        } else {
          const result = await pool.query(
            `INSERT INTO locales (key, value, locale) VALUES ($1, $2, $6), 
             ($1, $3, $7), ($1, $4, $8), ($1, $5, $9) RETURNING *`,
            [key, english, polish, russian, ukrainian, "en", "pl", "ru", "ua"],
          );

          res.status(200).json(result.rows);
        }
      } else {
        res.status(422).json({ message: "Unprocessable Entity" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const editOldLocale = async (req, res) => {
    if (
      ![constants.ROLES.ADMIN, constants.ROLES.SUPERVISOR].includes(req.role)
    ) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { key, english, russian, polish, ukrainian } = req.body;

      if (key && english && russian && polish && ukrainian) {
        const resultEnglish = await pool.query(
          "UPDATE locales SET value = $2 WHERE key = $1 AND locale = $3 RETURNING *",
          [key, english, "en"],
        );
        const resultPolish = await pool.query(
          "UPDATE locales SET value = $2 WHERE key = $1 AND locale = $3 RETURNING *",
          [key, polish, "pl"],
        );
        const resultRussian = await pool.query(
          "UPDATE locales SET value = $2 WHERE key = $1 AND locale = $3 RETURNING *",
          [key, russian, "ru"],
        );
        const resultUkrainian = await pool.query(
          "UPDATE locales SET value = $2 WHERE key = $1 AND locale = $3 RETURNING *",
          [key, ukrainian, "ua"],
        );

        res
          .status(200)
          .json([
            resultEnglish.rows[0],
            resultPolish.rows[0],
            resultRussian.rows[0],
            resultUkrainian.rows[0],
          ]);
      } else {
        res.status(422).json({ message: "Not all valid fields are filled!" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const deleteLocale = async (req, res) => {
    if (
      ![constants.ROLES.ADMIN, constants.ROLES.SUPERVISOR].includes(req.role)
    ) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { key } = req.body;

      const result = await pool.query(
        "DELETE FROM locales WHERE key = $1 RETURNING *",
        [key],
      );

      res
        .status(200)
        .json({ message: "Locales deleted", locales: result.rows });
    } catch (error) {
      res.status(500).json({ error });
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
