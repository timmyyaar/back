const { verifyToken } = require("../../middlewares");

const { Router } = require("express");

const discountsController = require("./controller");

const discountsRouter = new Router();

discountsRouter
		.get("/discounts", discountsController.getDiscounts)
		.post("/discounts", verifyToken, discountsController.createDiscount)
		.put("/discounts/:id", verifyToken, discountsController.editDiscount)
		.delete("/discounts/:id", verifyToken, discountsController.deleteDiscount);

module.exports = discountsRouter;
