const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const constants = require("../../constants");

const { Client } = require("pg");

const env = require("../../helpers/environments");

const AUTH_COOKIE_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000;

const UsersController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

    return new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });
  };

  const signUp = async (req, res) => {
    const client = getClient();

    try {
      const { email, password } = req.body;

      const data = {
        email,
        password: await bcrypt.hash(password, 10),
      };

      await client.connect();

      const userQuery = await client.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      const existingUser = userQuery.rows[0];

      if (existingUser) {
        return res.status(409).send("User with such email already exists!");
      }

      const result = await client.query(
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
    } finally {
      await client.end();
    }
  };

  const login = async (req, res) => {
    const client = getClient();

    try {
      const { email, password } = req.body;

      await client.connect();

      const userQuery = await client.query(
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
            domain: 'takeutime.pl',
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
    } finally {
      await client.end();
    }
  };

  const getUsers = async (req, res) => {
    const client = getClient();

    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      await client.connect();
      const result = await client.query("SELECT * FROM users ORDER BY id ASC");

      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const createUser = async (req, res) => {
    const client = getClient();

    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { email, password, role } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      await client.connect();

      const userQuery = await client.query(
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

      const result = await client.query(
        "INSERT INTO users(email, password, role) VALUES($1, $2, $3) RETURNING *",
        [email, hashedPassword, role]
      );

      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const updateUserRole = async (req, res) => {
    const client = getClient();

    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { role } = req.body;
      const id = req.params.id;

      await client.connect();

      const userQuery = await client.query(
        "SELECT * FROM users WHERE id = $1",
        [id]
      );
      const existingUser = userQuery.rows[0];

      if (existingUser.role === role) {
        return res
          .status(422)
          .json({ message: "User already have this role!" });
      }

      const result = await client.query(
        "UPDATE users SET role = $2 WHERE id = $1 RETURNING *",
        [id, role]
      );

      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const changePassword = async (req, res) => {
    const client = getClient();

    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { password } = req.body;
      const id = req.params.id;

      const hashedPassword = await bcrypt.hash(password, 10);

      await client.connect();

      const result = await client.query(
        "UPDATE users SET password = $2 WHERE id = $1 RETURNING *",
        [id, hashedPassword]
      );

      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const deleteUser = async (req, res) => {
    const client = getClient();

    if (req.role !== constants.ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const id = req.params.id;

      await client.connect();

      const result = await client.query(
        "DELETE FROM users WHERE id = $1 RETURNING *",
        [id]
      );
      await client.query(
        'UPDATE "order" SET cleaner_id = null WHERE id = $1 RETURNING *',
        [id]
      );

      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  return {
    signUp,
    login,
    getUsers,
    createUser,
    updateUserRole,
    changePassword,
    deleteUser,
  };
};

module.exports = UsersController();
