const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const pricesController = require("./controller");

const pricesRouter = new Router();

pricesRouter
  .get("/prices", pricesController.getPrices)
  .put("/prices", verifyToken, pricesController.updatePrice);

module.exports = pricesRouter;
