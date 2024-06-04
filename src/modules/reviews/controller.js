const { sql } = require("@vercel/postgres");

const constants = require("../../constants");

const ReviewsController = () => {
  const getReviews = async (req, res) => {
    try {
      const result = await sql`SELECT * FROM reviews ORDER BY id ASC`;

      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const createReview = async (req, res) => {
    try {
      const { rating, name, email, text, visible } = req.body;

      if (rating && name && email && text) {
        if (!constants.EMAIL_REGEX.test(email)) {
          res.status(422).json({ message: "Invalid email" });
        }

        const isVisible = visible ? "1" : "0";
        const result =
          await sql`INSERT INTO reviews(rating, name, email, text, visible)
            VALUES(${rating}, ${name}, ${email}, ${text}, ${isVisible}) RETURNING *`;

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

        const reviewExists = await sql`SELECT * FROM reviews WHERE id = ${id}`;

        if (reviewExists.rowCount === 0) {
          res.status(404).json({ message: "Review not found" });
        } else {
          const isVisible = visible ? "1" : "0";

          const result =
            await sql`UPDATE reviews SET rating = ${rating}, name = ${name},
              email = ${email}, text = ${text}, visible = ${isVisible} WHERE id = ${id} RETURNING *`;

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

      const result = await sql`DELETE FROM reviews WHERE id = ${id} RETURNING *`

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
