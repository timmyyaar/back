const { Router } = require("express");

const paymentController = require("./controller");

const paymentRouter = new Router();

paymentRouter
  .post("/create-transaction", paymentController.createTransaction)
  .post("/receive-notification", paymentController.receiveNotification);

module.exports = paymentRouter;
