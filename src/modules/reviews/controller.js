const pool = require("../../db/pool");

const constants = require("../../constants");

const ReviewsController = () => {
  let retriesCount = 0;

  const getReviews = async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM reviews ORDER BY id ASC");

      retriesCount = 0;

      return res.json(result.rows);
    } catch (error) {
      if (retriesCount < constants.DEFAULT_RETRIES_COUNT) {
        retriesCount++;

        setTimeout(
          async () => await getReviews(req, res),
          constants.DEFAULT_RETRIES_DELAY,
        );
      } else {
        return res.status(500).json({ error });
      }
    }
  };

  const createReview = async (req, res) => {
    try {
      const { rating, name, email, text, visible } = req.body;

      if (rating && name && email && text) {
        if (!constants.EMAIL_REGEX.test(email)) {
          res.status(422).json({ message: "Invalid email" });
        }

        const result = await pool.query(
          "INSERT INTO reviews(rating, name, email, text, visible) VALUES($1, $2, $3, $4, $5) RETURNING *",
          [rating, name, email, text, visible ? "1" : "0"],
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

  const editReview = async (req, res) => {
    try {
      const { rating, name, email, text, visible } = req.body;
      const id = req.params.id;

      if (rating && name && email && text) {
        if (!constants.EMAIL_REGEX.test(email)) {
          res.status(422).json({ message: "Invalid email" });
        }

        const reviewExists = await pool.query(
          "SELECT * FROM reviews WHERE id = $1",
          [id],
        );

        if (reviewExists.rowCount === 0) {
          res.status(404).json({ message: "Review not found" });
        } else {
          const result = await pool.query(
            "UPDATE reviews SET rating = $2, name = $3, email = $4, text = $5, visible = $6 WHERE id = $1 RETURNING *",
            [id, rating, name, email, text, visible ? "1" : "0"],
          );

          res.status(200).json(result.rows[0]);
        }
      } else {
        res
          .status(422)
          .json({ message: "One of the required fields is missing" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const deleteReview = async (req, res) => {
    try {
      const id = req.params.id;

      const result = await pool.query(
        "DELETE FROM reviews WHERE id = $1 RETURNING *",
        [id],
      );

      res
        .status(200)
        .json({ message: "Review deleted", review: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  return {
    getReviews,
    createReview,
    editReview,
    deleteReview,
  };
};

module.exports = ReviewsController();
