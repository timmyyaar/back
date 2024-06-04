const { sql } = require("@vercel/postgres");

const DiscountsController = () => {
  const getDiscounts = async (req, res) => {
    try {
      const result = await sql`SELECT * FROM discounts ORDER BY id ASC`;

      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const createDiscount = async (req, res) => {
    try {
      const { date, value } = req.body;

      if (date && value) {
        const existingDiscount =
          await sql`SELECT * FROM discounts WHERE date = ${date}`;

        if (existingDiscount.rows[0]) {
          return res
            .status(409)
            .json({ message: "Discount for this date already exists!" });
        }

        const result =
          await sql`INSERT INTO discounts(date, value) VALUES(${date}, ${value}) RETURNING *`;

        res.status(200).json(result.rows[0]);
      } else {
        res
          .status(422)
          .json({ message: "One of the required fields is missing" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const editDiscount = async (req, res) => {
    try {
      const { date, value } = req.body;
      const id = req.params.id;

      if (date && value) {
        const {
          rows: [{ exists: existingDiscount }],
        } = await sql`SELECT EXISTS(SELECT * FROM discounts WHERE id = ${id})`;
        const {
          rows: [{ exists: existingDiscountWithDate }],
        } =
          await sql`SELECT EXISTS(SELECT * FROM discounts WHERE id != ${id} AND date = ${date})`;

        if (!existingDiscount) {
          return res.status(404).json({ message: "Discount not found" });
        }

        if (existingDiscountWithDate) {
          return res
            .status(409)
            .json({ message: "Discount for this date already exists!" });
        }

        const result =
          await sql`UPDATE discounts SET date = ${date}, value = ${value} WHERE id = ${id} RETURNING *`;

        res.status(200).json(result.rows[0]);
      } else {
        res
          .status(422)
          .json({ message: "One of the required fields is missing" });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
    }
  };

  const deleteDiscount = async (req, res) => {
    try {
      const id = req.params.id;

      const result =
        await sql`DELETE FROM discounts WHERE id = ${id} RETURNING *`;

      res
        .status(200)
        .json({ message: "Discount deleted", review: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error });
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
