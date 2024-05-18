const { Client } = require("pg");

const env = require("../helpers/environments");
const { PAYMENT_STATUS } = require("../constants");

const stripe = require("stripe")(env.getEnvironment("STRIPE_CONNECTION_KEY"));

const webhookSecret = env.getEnvironment("STRIPE_WEBHOOK_SECRET");
const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");

const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    res.status(200).json({ received: true });

    const isPaymentCaptured =
      event.type === "payment_intent.amount_capturable_updated";
    const isPaymentSucceeded = event.type === "payment_intent.succeeded";
    const isPaymentFailed = event.type === "payment_intent.payment_failed";

    if (!isPaymentFailed && !isPaymentSucceeded && !isPaymentCaptured) {
      return;
    }

    const paymentIntentMetadata = event.data.object.metadata;

    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    try {
      await client.connect();

      if (paymentIntentMetadata.employeePaymentId) {
        const employeePaymentId = paymentIntentMetadata.employeePaymentId;

        const {
          rows: [payment],
        } = await client.query("SELECT * FROM payments WHERE id = $1", [
          +employeePaymentId,
        ]);

        if (!payment) {
          return Promise.resolve();
        }

        await client.query(
          "UPDATE payments SET is_paid = $2, is_failed = $3 WHERE id = $1 RETURNING *",
          [+employeePaymentId, isPaymentSucceeded, isPaymentFailed]
        );
      } else if (paymentIntentMetadata.orderIds) {
        const orderIds =
          paymentIntentMetadata.orderIds
            .split(",")
            .map((orderId) => +orderId) || [];

        await Promise.all(
          orderIds.map(async (id) => {
            const orderQuery = await client.query(
              'SELECT * FROM "order" WHERE id = $1',
              [id]
            );
            const order = orderQuery.rows[0];

            const existingPaymentIntent = order?.payment_intent;

            if (!existingPaymentIntent) {
              return Promise.resolve();
            }

            await client.query(
              'UPDATE "order" SET payment_status = $2 WHERE id = $1 RETURNING *',
              [
                id,
                isPaymentFailed
                  ? PAYMENT_STATUS.FAILED
                  : PAYMENT_STATUS.WAITING_FOR_CONFIRMATION,
              ]
            );
          })
        );
      }
    } finally {
      await client.end();
    }
  } catch (error) {
    return res.status(500).json({ error, received: true });
  }
};

module.exports = {
  stripeWebhook,
};
