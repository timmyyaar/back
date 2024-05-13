const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const constants = require("../../constants");
const { getUpdatedUserRating } = require("../../utils");

const pool = require("../../db/pool");

const env = require("../../helpers/environments");

const AUTH_COOKIE_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000;

const getUserWithRating = (user) => {
  const rating = user.rating?.split("");

  return {
    ...user,
    rating: rating
      ? Number(
          (
            rating.reduce((result, item) => result + +item, 0) / rating.length
          ).toFixed(1)
        )
      : 5,
  };
};

const UsersController = () => {
  const signUp = async (req, res) => {
    try {
      const { email, password } = req.body;

      const data = {
        email,
        password: await bcrypt.hash(password, 10),
      };

      const userQuery = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      const existingUser = userQuery.rows[0];

      if (existingUser) {
        return res.status(409).send("User with such email already exists!");
      }

      const result = await pool.query(
        "INSERT INTO users(email, password, role) VALUES($1, $2, $3) RETURNING *",
        [data.email, data.password, "admin"]
      );

      if (result.rows[0]) {
        return res.status(201).send(result.rows[0]);
      } else {
        return res.status(409).send("Details are not correct");
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const login = async (req, res) => {
    try {
      const { email, password } = req.body;

      const userQuery = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      const existingUser = userQuery.rows[0];

      if (existingUser) {
        const isPasswordCorrect = await bcrypt.compare(
          password,
          existingUser.password
        );

        if (isPasswordCorrect) {
          const token = jwt.sign(
            { id: existingUser.id, role: existingUser.role },
            env.getEnvironment("SECRET_WORD"),
            {
              expiresIn: AUTH_COOKIE_EXPIRATION_TIME,
            }
          );

          res.cookie("authToken", token, {
            maxAge: AUTH_COOKIE_EXPIRATION_TIME,
            httpOnly: true,
            secure: true,
          });

          return res.status(201).send({
            id: existingUser.id,
            email: existingUser.email,
            role: existingUser.role,
          });
        } else {
          return res.status(401).json({ message: "Incorrect password!" });
        }
      } else {
        res.status(404).json({ message: "User doesn't exist!" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const getUsers = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const result = await pool.query("SELECT * FROM users ORDER BY id ASC");

      res.json(result.rows.map(getUserWithRating));
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const getMyUser = async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM users WHERE id = $1", [
        req.userId,
      ]);
      const user = getUserWithRating(result.rows[0]);

      res.json({
        id: user.id,
        email: user.email,
        rating: user.rating,
        role: user.role,
      });
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const createUser = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const {
        email,
        password,
        role,
        haveVacuumCleaner = false,
        haveCar = false,
        firstName = "",
        lastName = "",
      } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      const userQuery = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      const existingUser = userQuery.rows[0];

      if (existingUser) {
        return res
          .status(422)
          .json({ message: "User with this email already exists!" });
      }

      if (!constants.EMAIL_REGEX.test(email)) {
        return res.status(422).json({ message: "Invalid email!" });
      }

      const result = await pool.query(
        `INSERT INTO users(email, password, role, have_vacuum_cleaner,
         have_car, first_name, last_name) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          email,
          hashedPassword,
          role,
          haveVacuumCleaner,
          haveCar,
          firstName,
          lastName,
        ]
      );

      res.status(200).json(getUserWithRating(result.rows[0]));
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const updateUser = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { role, haveVacuumCleaner, haveCar, firstName, lastName } =
        req.body;
      const id = req.params.id;

      const result = await pool.query(
        `UPDATE users SET role = $2, have_vacuum_cleaner = $3, have_car = $4,
           first_name = $5, last_name = $6 WHERE id = $1 RETURNING *`,
        [id, role, haveVacuumCleaner, haveCar, firstName, lastName]
      );

      return res.status(200).json(getUserWithRating(result.rows[0]));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const changePassword = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { password } = req.body;
      const id = req.params.id;

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        "UPDATE users SET password = $2 WHERE id = $1 RETURNING *",
        [id, hashedPassword]
      );

      res.status(200).json(getUserWithRating(result.rows[0]));
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const deleteUser = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const id = req.params.id;

      const result = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING *",
        [id]
      );
      await pool.query(
        'UPDATE "order" SET cleaner_id = null WHERE id = $1 RETURNING *',
        [id]
      );

      res.status(200).json(getUserWithRating(result.rows[0]));
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const updateUserRating = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { rating } = req.body;
      const id = req.params.id;

      const userQuery = await pool.query("SELECT * FROM users WHERE id = $1", [
        id,
      ]);
      const existingUser = userQuery.rows[0];
      const currentUserRating = existingUser.rating || "";
      const updatedRating = getUpdatedUserRating(currentUserRating, rating);

      const result = await pool.query(
        "UPDATE users SET rating = $2 WHERE id = $1 RETURNING *",
        [id, updatedRating]
      );

      res.status(200).json(getUserWithRating(result.rows[0]));
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  return {
    signUp,
    login,
    getUsers,
    getMyUser,
    createUser,
    updateUser,
    changePassword,
    deleteUser,
    updateUserRating,
  };
};

module.exports = UsersController();
