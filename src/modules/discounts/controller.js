const pool = require("../../db/pool");
const constants = require("../../constants");

const DiscountsController = () => {
  const getDiscounts = async (req, res) => {
    let retriesCount = 0;

    while (retriesCount < constants.DEFAULT_RETRIES_COUNT) {
      try {
        const result = await pool.query(
          "SELECT * FROM discounts ORDER BY id ASC",
        );

        return res.json(result.rows);
      } catch (error) {
        retriesCount++;

        if (retriesCount < constants.DEFAULT_RETRIES_COUNT) {
          await new Promise((resolve) =>
            setTimeout(resolve, constants.DEFAULT_RETRIES_DELAY),
          );
        } else {
          return res.status(500).json({ error });
        }
      }
    }
  };

  const createDiscount = async (req, res) => {
    try {
      const { date, value } = req.body;

      if (date && value) {
        const existingDiscount = await pool.query(
          "SELECT * FROM discounts WHERE date = $1",
          [date],
        );

        if (existingDiscount.rows[0]) {
          return res
            .status(409)
            .json({ message: "Discount for this date already exists!" });
        }

        const result = await pool.query(
          "INSERT INTO discounts(date, value) VALUES($1, $2) RETURNING *",
          [date, value],
        );

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
        const existingDiscount = await pool.query(
          "SELECT * FROM discounts WHERE id = $1",
          [id],
        );
        const existingDiscountWithDate = await pool.query(
          "SELECT * FROM discounts WHERE id != $1 AND date = $2",
          [id, date],
        );

        if (existingDiscount.rowCount === 0) {
          return res.status(404).json({ message: "Discount not found" });
        }

        if (existingDiscountWithDate.rows[0]) {
          return res
            .status(409)
            .json({ message: "Discount for this date already exists!" });
        }

        const result = await pool.query(
          "UPDATE discounts SET date = $2, value = $3 WHERE id = $1 RETURNING *",
          [id, date, value],
        );

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

  const deleteDiscount = async (req, res) => {
    try {
      const id = req.params.id;

      const result = await pool.query(
        "DELETE FROM discounts WHERE id = $1 RETURNING *",
        [id],
      );

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
