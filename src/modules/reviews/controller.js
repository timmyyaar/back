const pool = require("../../db/pool");

const constants = require("../../constants");
const requestWithRetry = require("../../db/requestWithRetry");

const ReviewsController = () => {
  const getReviews = async (req, res) => {
    const client = await pool.connect();

    try {
      const result = await requestWithRetry(
        async () => await client.query("SELECT * FROM reviews ORDER BY id ASC"),
      );

      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({
        message: "Failed to fetch reviews after multiple attempts",
        error: error.message,
      });
    } finally {
      client.release();
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
