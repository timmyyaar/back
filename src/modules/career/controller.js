const { Client } = require("pg");

const env = require("../../helpers/environments");

const constants = require("../../constants");

const CareersController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const getCareers = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    const client = getClient();

    try {
      await client.connect();
      const result = await client.query("SELECT * FROM careers");

      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const createNewCareers = async (req, res) => {
    const client = getClient();

    try {
      const { name, phone, email, about = "", referralCode = null } = req.body;
      if (name && phone && email) {
        await client.connect();

        const result = await client.query(
          "INSERT INTO careers(name, phone, email, about, referral_code) VALUES($1, $2, $3, $4, $5) RETURNING *",
          [name, phone, email, about, referralCode]
        );

        res.status(200).json({ careers: result.rows[0] });
      } else {
        res.status(422).json({ message: "Unprocessable Entity" });
      }
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const deleteCareers = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    const client = getClient();

    try {
      const { id } = req.params;

      await client.connect();

      const result = await client.query(
        "DELETE FROM careers WHERE id = $1 RETURNING *",
        [id]
      );

      return res
        .status(200)
        .json({ message: "Careers deleted", careers: result.rows });
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  return {
    getCareers,
    createNewCareers,
    deleteCareers,
  };
};

module.exports = CareersController();
