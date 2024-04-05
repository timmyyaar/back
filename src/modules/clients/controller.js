const { Client } = require("pg");

const env = require("../../helpers/environments");

const ClientsController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const getClients = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();

      const clients = await client.query("SELECT * FROM clients");

      res.status(200).json(clients.rows);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      client.end();
    }
  };

  const addClient = async (req, res) => {
    const client = getClient();

    const {
      name,
      phone,
      email,
      address,
      instagram,
      firstOrderCreationDate,
      firstOrderDate,
    } = req.body;

    try {
      await client.connect();

      const createdClient = await client.query(
        `INSERT INTO clients (name, phone, email, address, first_order_creation_date, first_order_date, instagram)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          name,
          phone,
          email,
          address,
          firstOrderCreationDate,
          firstOrderDate,
          instagram,
        ]
      );

      res.status(200).json(createdClient.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      client.end();
    }
  };

  const updateClient = async (req, res) => {
    const client = getClient();

    const { id } = req.params;
    const {
      name,
      phone,
      email,
      address,
      instagram,
      firstOrderCreationDate,
      firstOrderDate,
    } = req.body;

    try {
      await client.connect();

      const updatedClient = await client.query(
        `UPDATE clients SET name = $2, phone = $3,
         email = $4, address = $5, instagram = $6, first_order_creation_date = $7, first_order_date = $8
         WHERE id = $1 RETURNING *`,
        [
          id,
          name,
          phone,
          email,
          address,
          instagram,
          firstOrderCreationDate,
          firstOrderDate,
        ]
      );

      res.status(200).json(updatedClient.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      client.end();
    }
  };

  const deleteClient = async (req, res) => {
    const client = getClient();

    const { id } = req.params;

    try {
      await client.connect();

      const result = await client.query("DELETE FROM clients WHERE id = $1", [
        id,
      ]);

      res.json({ message: "Client deleted" });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  return {
    getClients,
    addClient,
    updateClient,
    deleteClient,
  };
};

module.exports = ClientsController();
