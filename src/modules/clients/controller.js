const pool = require("../../db/pool");

const ClientsController = () => {
  const getClients = async (req, res) => {
    try {
      const clients = await pool.query(
        "SELECT * FROM clients ORDER BY id DESC"
      );

      res.status(200).json(clients.rows);
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const addClient = async (req, res) => {
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
      const createdClient = await pool.query(
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
    }
  };

  const updateClient = async (req, res) => {
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
      const updatedClient = await pool.query(
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
    }
  };

  const deleteClient = async (req, res) => {
    const { id } = req.params;

    try {
      await pool.query("DELETE FROM clients WHERE id = $1", [id]);

      res.json({ message: "Client deleted" });
    } catch (error) {
      res.status(500).json({ error });
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
