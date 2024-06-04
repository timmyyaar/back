const { sql } = require("@vercel/postgres");

const ClientsController = () => {
  const getClients = async (req, res) => {
    try {
      const clients = await sql`SELECT * FROM clients`;

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
      const createdClient =
        await sql`INSERT INTO clients (name, phone, email, address, first_order_creation_date,
          first_order_date, instagram) VALUES (${name}, ${phone}, ${email}, ${address},
          ${firstOrderCreationDate}, ${firstOrderDate}, ${instagram}) RETURNING *`;

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
      const updatedClient =
        await sql`UPDATE clients SET name = ${name}, phone = ${phone}, email = ${email},
          address = ${address}, instagram = ${instagram}, 
          first_order_creation_date = ${firstOrderCreationDate}, first_order_date = ${firstOrderDate}
          WHERE id = ${id} RETURNING *`;

      res.status(200).json(updatedClient.rows[0]);
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const deleteClient = async (req, res) => {
    const { id } = req.params;

    try {
      await sql`DELETE FROM clients WHERE id = ${id}`;

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
