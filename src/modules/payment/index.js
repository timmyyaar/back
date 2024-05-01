const { Router } = require("express");

const paymentController = require("./controller");

const { verifyToken } = require("../../middlewares");

const paymentRouter = new Router();

paymentRouter
  .post("/payment-intent", paymentController.createPaymentIntent)
  .patch("/payment-intent/:id", paymentController.updatePaymentIntent)
  .delete("/payment-intent/:id", paymentController.cancelPaymentIntent)
  .post("/capture-payment/:id", verifyToken, paymentController.capturePayment)
  .get("/payment-intent/:id", paymentController.getPaymentIntent);

module.exports = paymentRouter;
