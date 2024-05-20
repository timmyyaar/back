const { Router } = require("express");

const paymentController = require("./controller");

const { verifyToken } = require("../../middlewares");

const paymentRouter = new Router();

paymentRouter
  .post("/payment-intent", paymentController.createPaymentIntent)
  .patch("/payment-intent/:id", paymentController.updatePaymentIntent)
  .patch(
    "/payment-intent/:id/setup-future-usage",
    verifyToken,
    paymentController.setupFutureUsage
  )
  .delete("/payment-intent/:id", paymentController.cancelPaymentIntent)
  .post("/capture-payment/:id", verifyToken, paymentController.capturePayment)
  .get("/payment-intent/:id", paymentController.getPaymentIntent)
  .get(
    "/payment-methods/:id",
    verifyToken,
    paymentController.getCustomerPaymentMethods
  )
  .patch(
    "/payment-methods/:id/detach",
    verifyToken,
    paymentController.detachPaymentMethod
  );

module.exports = paymentRouter;
