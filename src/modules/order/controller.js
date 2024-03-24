const { Client } = require("pg");

const { ROLES } = require("../../constants");

const env = require("../../helpers/environments");

const OrderController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const getOrder = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();
      const result = await client.query(
        'SELECT * FROM "order" ORDER BY id DESC'
      );

      res.json({ order: result.rows });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const createOrder = async (req, res) => {
    const client = getClient();

    try {
      const {
        name,
        number,
        email,
        address,
        date,
        onlinePayment = false,
        requestPreviousCleaner = false,
        personalData = false,
        price = "",
        promo = "",
        estimate = "",
        title = "",
        counter = "",
        subService = "",
        secTitle = "",
        secCounter = "",
        secSubService = "",
        mainServicePrice,
        secondServicePrice,
      } = req.body;

      if (name && number && email && address && date) {
        await client.connect();

        if (secTitle) {
          const result = await client.query(
            `INSERT INTO "order" 
              (name, number, email, address, date, onlinePayment, 
              requestPreviousCleaner, personalData, promo, 
              estimate, title, counter, subService, price, total_service_price) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
              $12, $13, $14, $19), ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $15, 
              $16, $17, $18, $19) RETURNING *`,
            [
              name,
              number,
              email,
              address,
              date,
              onlinePayment,
              requestPreviousCleaner,
              personalData,
              promo,
              estimate,
              title,
              counter,
              subService,
              mainServicePrice,
              secTitle,
              secCounter,
              secSubService,
              secondServicePrice,
              price,
            ]
          );

          res.status(200).json({ order: result.rows });
        } else {
          const result = await client.query(
            `INSERT INTO "order" 
             (name, number, email, address, date, onlinePayment, 
             requestPreviousCleaner, personalData, price, promo, 
             estimate, title, counter, subService, total_service_price) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
             $10, $11, $12, $13, $14, $15) RETURNING *`,
            [
              name,
              number,
              email,
              address,
              date,
              onlinePayment,
              requestPreviousCleaner,
              personalData,
              mainServicePrice,
              promo,
              estimate,
              title,
              counter,
              subService,
              price,
            ]
          );

          res.status(200).json({ order: result.rows[0] });
        }
      } else {
        res.status(422).json({ message: "Unprocessable Entity" });
      }
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const deleteOrder = async (req, res) => {
    const client = getClient();

    try {
      const { id } = req.body;
      await client.connect();
      const result = await client.query(
        'DELETE FROM "order" WHERE id = $1 RETURNING *',
        [id]
      );

      res.status(200).json({ message: "Order deleted", gift: result.rows });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const assignOrder = async (req, res) => {
    const client = getClient();

    try {
      const id = req.params.id;
      const cleanerId = req.params.cleanerId;
      const role = req.role;

      await client.connect();

      const orderQuery = await client.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id]
      );
      const existingOrder = orderQuery.rows[0];

      if (existingOrder.cleaner_id && role !== ROLES.ADMIN) {
        return res
          .status(422)
          .json({ message: "Oops, someone has already taken your order!" });
      }

      const result = await client.query(
        'UPDATE "order" SET cleaner_id = $2, status = $3 WHERE id = $1 RETURNING *',
        [id, cleanerId || null, +cleanerId ? "approved" : "created"]
      );

      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const updateOrderStatus = async (req, res) => {
    const client = getClient();

    try {
      const id = req.params.id;
      const status = req.params.status;

      await client.connect();

      const result = await client.query(
        'UPDATE "order" SET status = $2 WHERE id = $1 RETURNING *',
        [id, status]
      );

      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  return {
    getOrder,
    createOrder,
    deleteOrder,
    assignOrder,
    updateOrderStatus,
  };
};

module.exports = OrderController();
