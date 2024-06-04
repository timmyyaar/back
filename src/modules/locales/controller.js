const { sql } = require("@vercel/postgres");

const constants = require("../../constants");

const LocalesController = () => {
  const getLocales = async (req, res) => {
    try {
      const result = await sql`SELECT * FROM locales`;

      return res.json({ locales: result.rows });
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const createNewLocale = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { key, english, polish, russian, ukrainian } = req.body;

      if (key && english && polish && russian && ukrainian) {
        const localeExists =
          await sql`SELECT * FROM locales WHERE key = ${key}`;

        if (localeExists.rowCount > 0) {
          res.status(409).json({ message: "Locale already exists" });
        } else {
          const result =
            await sql`INSERT INTO locales (key, value, locale) VALUES (${key}, ${english}, ${"en"}), 
              (${key}, ${polish}, ${"pl"}), (${key}, ${russian}, ${"ru"}),
              (${key}, ${ukrainian}, ${"ua"}) RETURNING *`;

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
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { key, english, russian, polish, ukrainian } = req.body;

      if (key && english && russian && polish && ukrainian) {
        const resultEnglish =
          await sql`UPDATE locales SET value = ${english} WHERE
            key = ${key} AND locale = ${"en"} RETURNING *`;
        const resultPolish =
          await sql`UPDATE locales SET value = ${polish} WHERE
            key = ${key} AND locale = ${"pl"} RETURNING *`;
        const resultRussian =
          await sql`UPDATE locales SET value = ${russian} WHERE
            key = ${key} AND locale = ${"ru"} RETURNING *`;
        const resultUkrainian =
          await sql`UPDATE locales SET value = ${ukrainian} WHERE
            key = ${key} AND locale = ${"ua"} RETURNING *`;

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
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { key } = req.body;

      const result = await sql`DELETE FROM locales WHERE key = ${key} RETURNING *`

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
