const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const orderController = require("./controller");

const orderRouter = new Router();

orderRouter
  .post("/order", orderController.createOrder)
  .patch("/order/:id/send-feedback", orderController.sendFeedback)
  .get("/order/client-order", orderController.getClientOrder)
  .get("/order", verifyToken, orderController.getOrder)
  .get(
    "/order/client-orders/get-all",
    verifyToken,
    orderController.getAllClientOrders,
  )
  .put("/order/:id", verifyToken, orderController.updateOrder)
  .delete("/order/:id", verifyToken, orderController.deleteOrder)
  .patch("/order/refuse/:id", verifyToken, orderController.refuseOrder)
  .patch(
    "/order/extra-expenses/:id",
    verifyToken,
    orderController.updateOrderExtraExpenses,
  )
  .patch("/order/:id/assign", verifyToken, orderController.assignOrder)
  .patch("/order/:id/:cleanerId", verifyToken, orderController.assignOnMe)
  .patch(
    "/order/:id/update-status/:status",
    verifyToken,
    orderController.updateOrderStatus,
  )
  .put(
    "/order/:id/payment-intent",
    verifyToken,
    orderController.connectPaymentIntent,
  )
  .put(
    "/order/:id/sync-payment",
    verifyToken,
    orderController.syncOrderPaymentIntent,
  )
  .put(
    "/order/:id/approve-payment",
    verifyToken,
    orderController.approvePayment,
  )
  .put("/order/:id/mark-as-paid", verifyToken, orderController.markOrderAsPaid)
  .put("/order/:id/reset", verifyToken, orderController.resetOrder);

module.exports = orderRouter;
