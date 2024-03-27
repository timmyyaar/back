const { Router } = require("express");

const promoController = require("./controller");

const promoRouter = new Router();

promoRouter
  .get("/promo", promoController.getAllPromo)
  .get("/promo/:code", promoController.getPromoByCode)
  .post("/promo", promoController.createPromo)
  .delete("/promo/:id", promoController.deletePromo);

module.exports = promoRouter;
