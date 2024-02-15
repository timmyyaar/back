const { Client } = require('pg');

const env = require('../../helpers/environments');

const OrdersController = () => {
	const getClient = () => {
		const POSTGRES_URL = env.getEnvironment('POSTGRES_URL');
		const client = new Client({
			connectionString: `${POSTGRES_URL}?sslmode=require`,
		});

		return client;
	};

	const getOrders = async (_, res) => {
		const client = getClient();

		try {
			await client.connect();
			const result = await client.query('SELECT * FROM promo');

			res.json({ promo: result.rows });
		} catch (error) {
			res.status(500).json({ error });
		} finally {
			await client.end();
		}
	};

	const createNewOrder = async (req, res) => {
		const client = getClient();

		try {
			await client.connect();
			const { code, author, sale } = req.body;
			const result = await client.query(
				'INSERT INTO promo (code, author, sale) VALUES ($1, $2, $3) RETURNING *',
				[code, author, sale],
			);

			res.status(201).json({ promo: result.rows[0] });
		} catch (error) {
			res.status(500).json({ error });
		} finally {
			await client.end();
		}
	};

	const deleteOrder = async (req, res) => {
		const client = getClient();

		try {
			await client.connect();
			const { id } = req.params;
			const result = await client.query(
				'DELETE FROM promo WHERE id = $1 RETURNING *',
				[id],
			);

			if (result.rows.length === 0) {
				res.status(404).json({ message: 'Promo not found' });
			} else {
				res.status(200).json({ message: 'Promo deleted successfully' });
			}
		} catch (error) {
			res.status(500).json({ error });
		} finally {
			await client.end();
		}
	};

	return ({
		getOrders,
		createNewOrder,
		deleteOrder,
	});
};

module.exports = OrdersController();
