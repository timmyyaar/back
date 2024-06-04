const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { sql } = require("@vercel/postgres");

const env = require("../../helpers/environments");

const stripe = require("stripe")(env.getEnvironment("STRIPE_CONNECTION_KEY"));

const constants = require("../../constants");
const { getUpdatedUserRating } = require("../../utils");

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

      const userQuery = await sql`SELECT * FROM users WHERE email = ${email}`;
      const existingUser = userQuery.rows[0];

      if (existingUser) {
        return res.status(409).send("User with such email already exists!");
      }

      const result =
        await sql`INSERT INTO users(email, password, role) VALUES(${data.email},
        ${data.password}, ${"admin"}) RETURNING *`;

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

      const userQuery = await sql`SELECT * FROM users WHERE email = ${email}`;
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

  const logOut = (req, res) => {
    res.clearCookie("authToken", { httpOnly: true, secure: true });

    return res.status(200).json("Logged out");
  };

  const getUsers = async (req, res) => {
    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const result = await sql`SELECT * FROM users ORDER BY id ASC`;

      res.json(result.rows.map(getUserWithRating));
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const getMyUser = async (req, res) => {
    try {
      const result = await sql`SELECT * FROM users WHERE id = ${req.userId}`;
      const user = getUserWithRating(result.rows[0]);

      res.json({
        id: user.id,
        email: user.email,
        rating: user.rating,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        customerId: user.customer_id,
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

      if (!email || !password || !role || !firstName || !lastName) {
        return res.status(422).json({ message: "Some fields are empty" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userQuery = await sql`SELECT * FROM users WHERE email = ${email}`;
      const existingUser = userQuery.rows[0];

      if (existingUser) {
        return res
          .status(422)
          .json({ message: "User with this email already exists!" });
      }

      if (!constants.EMAIL_REGEX.test(email)) {
        return res.status(422).json({ message: "Invalid email!" });
      }

      const customer = await stripe.customers.create({
        name: `${firstName} ${lastName}`,
        email,
      });

      const result =
        await sql`INSERT INTO users(email, password, role, have_vacuum_cleaner,
          have_car, first_name, last_name, customer_id)
          VALUES(${email}, ${hashedPassword}, ${role}, ${haveVacuumCleaner}, ${haveCar},
          ${firstName}, ${lastName}, ${customer.id}) RETURNING *`;

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

      const result =
        await sql`UPDATE users SET role = ${role}, have_vacuum_cleaner = ${haveVacuumCleaner},
          have_car = ${haveCar}, first_name = ${firstName}, last_name = ${lastName}
          WHERE id = ${id} RETURNING *`;

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

      const result =
        await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${id} RETURNING *`;

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

      const result = await sql`DELETE FROM users WHERE id = ${id} RETURNING *`;

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

      const userQuery = await sql`SELECT * FROM users WHERE id = ${id}`;
      const existingUser = userQuery.rows[0];
      const currentUserRating = existingUser.rating || "";
      const updatedRating = getUpdatedUserRating(currentUserRating, rating);

      const result =
        await sql`UPDATE users SET rating = ${updatedRating} WHERE id = ${id} RETURNING *`;

      res.status(200).json(getUserWithRating(result.rows[0]));
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  return {
    signUp,
    login,
    logOut,
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
