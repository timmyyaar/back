const constants = require("../../constants");

const { Client } = require("pg");

const env = require("../../helpers/environments");

const DiscountsController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

    return new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });
  };

  const getDiscounts = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();
      const result = await client.query(
        "SELECT * FROM discounts ORDER BY id ASC"
      );

      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const createDiscount = async (req, res) => {
    const client = getClient();

    try {
      const { date, value } = req.body;

      if (date && value) {
        await client.connect();

        const existingDiscount = await client.query(
          "SELECT * FROM discounts WHERE date = $1",
          [date]
        );

        if (existingDiscount.rows[0]) {
          return res
            .status(409)
            .json({ message: "Discount for this date already exists!" });
        }

        const result = await client.query(
          "INSERT INTO discounts(date, value) VALUES($1, $2) RETURNING *",
          [date, value]
        );

        res.status(200).json(result.rows[0]);
      } else {
        res
          .status(422)
          .json({ message: "One of the required fields is missing" });
      }
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const editDiscount = async (req, res) => {
    const client = getClient();

    try {
      const { date, value } = req.body;
      const id = req.params.id;

      if (date && value) {
        await client.connect();

        const existingDiscount = await client.query(
          "SELECT * FROM discounts WHERE id = $1",
          [id]
        );
        const existingDiscountWithDate = await client.query(
          "SELECT * FROM discounts WHERE id != $1 AND date = $2",
          [id, date]
        );

        if (existingDiscount.rowCount === 0) {
          return res.status(404).json({ message: "Discount not found" });
        }

        if (existingDiscountWithDate.rows[0]) {
          return res
            .status(409)
            .json({ message: "Discount for this date already exists!" });
        }

        const result = await client.query(
          "UPDATE discounts SET date = $2, value = $3 WHERE id = $1 RETURNING *",
          [id, date, value]
        );

        res.status(200).json(result.rows[0]);
      } else {
        res
          .status(422)
          .json({ message: "One of the required fields is missing" });
      }
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const deleteDiscount = async (req, res) => {
    const client = getClient();

    try {
      const id = req.params.id;

      await client.connect();

      const result = await client.query(
        "DELETE FROM discounts WHERE id = $1 RETURNING *",
        [id]
      );

      res
        .status(200)
        .json({ message: "Discount deleted", review: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  return {
    getDiscounts,
    createDiscount,
    editDiscount,
    deleteDiscount,
  };
};

module.exports = DiscountsController();
