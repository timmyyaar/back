const constants = require("../../constants");

const { Client } = require("pg");

const env = require("../../helpers/environments");

const ReviewsController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

    return new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });
  };

  const getReviews = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();
      const result = await client.query(
        "SELECT * FROM reviews ORDER BY id ASC"
      );

      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const createReview = async (req, res) => {
    const client = getClient();

    try {
      const { rating, name, email, text, visible } = req.body;

      if (rating && name && email && text) {
        if (!constants.EMAIL_REGEX.test(email)) {
          res.status(422).json({ message: "Invalid email" });
        }

        await client.connect();

        const result = await client.query(
          "INSERT INTO reviews(rating, name, email, text, visible) VALUES($1, $2, $3, $4, $5) RETURNING *",
          [rating, name, email, text, visible ? "1" : "0"]
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

  const editReview = async (req, res) => {
    const client = getClient();

    try {
      const { rating, name, email, text, visible } = req.body;
      const id = req.params.id;

      if (rating && name && email && text) {
        if (!constants.EMAIL_REGEX.test(email)) {
          res.status(422).json({ message: "Invalid email" });
        }

        await client.connect();

        const reviewExists = await client.query(
          "SELECT * FROM reviews WHERE id = $1",
          [id]
        );

        if (reviewExists.rowCount === 0) {
          res.status(404).json({ message: "Review not found" });
        } else {
          const result = await client.query(
            "UPDATE reviews SET rating = $2, name = $3, email = $4, text = $5, visible = $6 WHERE id = $1 RETURNING *",
            [id, rating, name, email, text, visible ? "1" : "0"]
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
    } finally {
      await client.end();
    }
  };

  const deleteReview = async (req, res) => {
    const client = getClient();

    try {
      const id = req.params.id;

      await client.connect();

      const result = await client.query(
        "DELETE FROM reviews WHERE id = $1 RETURNING *",
        [id]
      );

      res
        .status(200)
        .json({ message: "Review deleted", review: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
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
