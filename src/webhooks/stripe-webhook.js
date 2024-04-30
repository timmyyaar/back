const { Client } = require("pg");

const env = require("../helpers/environments");
const { PAYMENT_STATUS } = require("../constants");

const stripe = require("stripe")(env.getEnvironment("STRIPE_CONNECTION_KEY"));

const webhookSecret = env.getEnvironment("STRIPE_WEBHOOK_SECRET");

const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const isPaymentCaptured =
      event.type === "payment_intent.amount_capturable_updated";
    const isPaymentFailed = event.type === "payment_intent.payment_failed";

    if (isPaymentCaptured || isPaymentFailed) {
      const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

      const client = new Client({
        connectionString: `${POSTGRES_URL}?sslmode=require`,
      });

      const paymentIntent = event.data.object;
      const orderIds = paymentIntent.metadata.orderIds?.split(",") || [];

      try {
        await client.connect();

        await Promise.all(
          orderIds.map(async (id) => {
            const orderQuery = await client.query(
              'SELECT * FROM "order" WHERE id = $1',
              [id]
            );
            const order = orderQuery.rows[0];

            const existingPaymentIntent = order?.payment_intent;

            if (existingPaymentIntent) {
              return Promise.resolve();
            }

            await client.query(
              'UPDATE "order" SET payment_intent = $2, payment_status = $3 WHERE id = $1 RETURNING *',
              [
                id,
                isPaymentFailed ? null : paymentIntent.id,
                isPaymentFailed
                  ? PAYMENT_STATUS.FAILED
                  : PAYMENT_STATUS.WAITING_FOR_CONFIRMATION,
              ]
            );
          })
        );
      } finally {
        await client.end();
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ error, received: true });
  }
};

module.exports = {
  stripeWebhook,
};
