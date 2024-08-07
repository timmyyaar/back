const env = require("../../helpers/environments");
const constants = require("../../constants");

const stripe = require("stripe")(env.getEnvironment("STRIPE_CONNECTION_KEY"));

const PaymentController = () => {
  const createPaymentIntent = async (req, res) => {
    const { price, email, metadata } = req.body;

    try {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(price * 100),
        currency: "pln",
        capture_method: "manual",
        receipt_email: email,
        ...(metadata && { metadata }),
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
    const { metadata, description = "" } = req.body;

    try {
      await stripe.paymentIntents.update(id, {
        metadata,
        description,
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
    const isAdmin = [
      constants.ROLES.ADMIN,
      constants.ROLES.SUPERVISOR,
    ].includes(req.role);
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

  const getPaymentIntent = async (req, res) => {
    const { id } = req.params;

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(id);

      return res.status(200).json(paymentIntent);
    } catch (error) {
      return res.status(404).json({ message: error.raw.message });
    }
  };

  const getCustomerPaymentMethods = async (req, res) => {
    const { id } = req.params;

    try {
      const paymentMethods = await stripe.customers.listPaymentMethods(id);

      return res.status(200).json(paymentMethods);
    } catch (error) {
      return res.status(404).json({ message: error.raw.message });
    }
  };

  const setupFutureUsage = async (req, res) => {
    const { id } = req.params;
    const { setupFutureUsage } = req.body;

    try {
      await stripe.paymentIntents.update(id, {
        setup_future_usage: setupFutureUsage,
      });

      return res.status(200).json({
        message: `Saved for future usage`,
      });
    } catch (error) {
      return res.status(400).json({ message: error.raw.message });
    }
  };

  const detachPaymentMethod = async (req, res) => {
    const { id } = req.params;

    try {
      await stripe.paymentMethods.detach(id);

      return res.status(200).json({
        message: "Payment method was detached",
      });
    } catch (error) {
      return res.status(400).json({ message: error.raw.message });
    }
  };

  const updatePaymentMethod = async (req, res) => {
    const { id } = req.params;
    const { metadata } = req.body;

    try {
      await stripe.paymentMethods.update(id, { metadata });

      return res.status(200).json({
        message: "Payment method was updated",
      });
    } catch (error) {
      return res.status(400).json({ message: error.raw.message });
    }
  };

  return {
    createPaymentIntent,
    updatePaymentIntent,
    cancelPaymentIntent,
    capturePayment,
    getPaymentIntent,
    getCustomerPaymentMethods,
    setupFutureUsage,
    detachPaymentMethod,
    updatePaymentMethod,
  };
};

module.exports = PaymentController();
