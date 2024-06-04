const { sql } = require("@vercel/postgres");

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
    const isPaymentSucceeded = event.type === "payment_intent.succeeded";
    const isPaymentFailed = event.type === "payment_intent.payment_failed";

    if (!isPaymentFailed && !isPaymentSucceeded && !isPaymentCaptured) {
      return;
    }

    const paymentIntentMetadata = event.data.object.metadata;

    if (paymentIntentMetadata.employeePaymentId) {
      const employeePaymentId = paymentIntentMetadata.employeePaymentId;

      await sql`UPDATE payments SET is_paid = ${isPaymentSucceeded}, is_failed = ${isPaymentFailed}
        WHERE id = ${+employeePaymentId} RETURNING *`;
    } else if (paymentIntentMetadata.orderIds) {
      const orderIds =
        paymentIntentMetadata.orderIds.split(",").map((orderId) => +orderId) ||
        [];

      await Promise.all(
        orderIds.map(async (id) => {
          const orderQuery = await pool.query(
            'SELECT * FROM "order" WHERE id = $1',
            [id]
          );
          const order = orderQuery.rows[0];

          const existingPaymentIntent = order?.payment_intent;

          const shouldSkip =
            !existingPaymentIntent ||
            order.payment_status === PAYMENT_STATUS.CONFIRMED;

          if (!shouldSkip) {
            const paymentStatus = isPaymentFailed
              ? PAYMENT_STATUS.FAILED
              : PAYMENT_STATUS.WAITING_FOR_CONFIRMATION;

            await sql`UPDATE "order" SET payment_status = ${paymentStatus} WHERE id = ${id} RETURNING *`;
          }
        })
      );
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ error, received: true });
  }
};

module.exports = {
  stripeWebhook,
};
