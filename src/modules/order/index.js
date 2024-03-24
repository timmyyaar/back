const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const orderController = require("./controller");

const orderRouter = new Router();

orderRouter
  .get("/order", verifyToken, orderController.getOrder)
  .post("/order", orderController.createOrder)
  .delete("/order", verifyToken, orderController.deleteOrder)
  .patch("/order/:id/:cleanerId", verifyToken, orderController.assignOrder)
  .patch(
    "/order/:id/update-status/:status",
    verifyToken,
    orderController.updateOrderStatus
  );

module.exports = orderRouter;
