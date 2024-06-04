const { sql } = require("@vercel/postgres");

const constants = require("../../constants");

const env = require("../../helpers/environments");

const CREATED_ORDERS_CHANNEL_ID = "-1002017671793";

const sendTelegramMessage = async () => {
  await fetch(
    `https://api.telegram.org/bot${env.getEnvironment(
      "TELEGRAM_BOT_ID"
    )}/sendMessage?` +
      new URLSearchParams({
        chat_id: CREATED_ORDERS_CHANNEL_ID,
        text: "New career application!",
      })
  );
};

const CareersController = () => {
  const getCareers = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const result = await sql`SELECT * FROM careers`;

      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const createNewCareers = async (req, res) => {
    try {
      const { name, phone, email, about = "", referralCode = null } = req.body;

      if (name && phone && email) {
        const result =
          await sql`INSERT INTO careers(name, phone, email, about, referral_code)
            VALUES(${name}, ${phone}, ${email}, ${about}, ${referralCode}) RETURNING *`;

        if (env.getEnvironment("MODE") === "prod") {
          await sendTelegramMessage();
        }

        return res.status(200).json(result.rows[0]);
      } else {
        return res.status(422).json({ message: "Unprocessable Entity" });
      }
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const deleteCareers = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { id } = req.params;

      const result =
        await sql`DELETE FROM careers WHERE id = ${id} RETURNING *`;

      return res
        .status(200)
        .json({ message: "Careers deleted", careers: result.rows });
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  return {
    getCareers,
    createNewCareers,
    deleteCareers,
  };
};

module.exports = CareersController();
