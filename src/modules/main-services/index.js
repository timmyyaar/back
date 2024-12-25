const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const mainServicesController = require("./controller");

const mainServicesRouter = new Router();

mainServicesRouter
  .get("/main-services", mainServicesController.getMainServices)
  .patch(
    "/main-services/:id/toggle-city/:city",
    verifyToken,
    mainServicesController.toggleCity,
  );

module.exports = mainServicesRouter;
