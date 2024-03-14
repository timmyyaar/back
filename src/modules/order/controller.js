const { Client } = require('pg');

const env = require('../../helpers/environments');

const OrderController = () => {
	const getClient = () => {
		const POSTGRES_URL = env.getEnvironment('POSTGRES_URL');
		const client = new Client({
			connectionString: `${POSTGRES_URL}?sslmode=require`,
		});

		return client;
	};

	const getOrder = async (req, res) => {
		const client = getClient();

		try {
			await client.connect();
			const result = await client.query('SELECT * FROM order');

			res.json({ gift: result.rows });
		} catch (error) {
			res.status(500).json({ error });
		} finally {
			await client.end();
		}
	};

	const createOrder = async (req, res) => {
		const client = getClient();

		try {
			// eslint-disable-next-line max-len
			const { price, promo, address, date, requestPreviousCleaner, onlinePayment, title, counter, subService, secTitle, secCounter, secSubService } = req.body;
			// eslint-disable-next-line max-len
			if (price && address && date && requestPreviousCleaner && onlinePayment && title && counter && subService && secTitle && secCounter && secSubService) {
				await client.connect();

				const result = await client.query(
					'INSERT INTO "order" (price, promo, address, date, requestPreviousCleaner, onlinePayment, title, counter, subService, secTitle, secCounter, secSubService) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
					// eslint-disable-next-line max-len
					[price, promo, address, date, requestPreviousCleaner, onlinePayment, title, counter, subService, secTitle, secCounter, secSubService],
				);

				res.status(200).json({ order: result.rows[0] });
			} else {
				res.status(422).json({ message: 'Unprocessable Entity' });
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
				'DELETE FROM order WHERE id = $1 RETURNING *',
				[id],
			);

			res.status(200).json({ message: 'Order deleted', gift: result.rows });
		} catch (error) {
			res.status(500).json({ error });
		} finally {
			await client.end();
		}
	};

	return ({
		getOrder,
		createOrder,
		deleteOrder,
	});
};

module.exports = OrderController();
