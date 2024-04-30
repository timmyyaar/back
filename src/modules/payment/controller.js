const env = require("../../helpers/environments");
const constants = require("../../constants");

const stripe = require("stripe")(env.getEnvironment("STRIPE_CONNECTION_KEY"));

const PaymentController = () => {
  const createPaymentIntent = async (req, res) => {
    const { price, email } = req.body;

    try {
      const intent = await stripe.paymentIntents.create({
        amount: price * 100,
        currency: "pln",
        capture_method: "manual",
        receipt_email: email,
      });

      return res
        .status(200)
        .json({ id: intent.id, clientSecret: intent.client_secret });
    } catch (error) {
      return res.status(400).json({ message: error.raw.message });
    }
  };

  const updatePaymentIntent = async (req, res) => {
    const { id } = req.params;
    const { metadata } = req.body;

    try {
      await stripe.paymentIntents.update(id, {
        metadata,
      });

      return res.status(200).json({
        message: `Updated payment intent ${id} metadata`,
      });
    } catch (error) {
      return res.status(400).json({ message: error.raw.message });
    }
  };

  const cancelPaymentIntent = async (req, res) => {
    const { id } = req.params;

    try {
      await stripe.paymentIntents.cancel(id);

      return res.status(200).json({
        message: `Payment intent ${id} is canceled`,
      });
    } catch (error) {
      return res.status(400).json({ message: error.raw.message });
    }
  };

  const capturePayment = async (req, res) => {
    const isAdmin = req.role === constants.ROLES.ADMIN;
    const { id } = req.params;

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const intent = await stripe.paymentIntents.capture(id);

      return res.status(200).json(intent);
    } catch (error) {
      return res.status(400).json({ message: error.raw.message });
    }
  };

  return {
    createPaymentIntent,
    updatePaymentIntent,
    cancelPaymentIntent,
    capturePayment,
  };
};

module.exports = PaymentController();
