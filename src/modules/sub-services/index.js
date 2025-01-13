const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const subServicesController = require("./controller");

const subServicesRouter = new Router();

subServicesRouter
  .get("/sub-services", subServicesController.getSubServices)
  .patch(
    "/sub-services/:id/toggle-boolean",
    verifyToken,
    subServicesController.toggleBooleanField,
  )
  .patch(
    "/sub-services/:id/toggle-city/:city",
    verifyToken,
    subServicesController.toggleCity,
  )
  .patch(
    "/sub-services/:id/update-main-services",
    verifyToken,
    subServicesController.updateConnectedMainServices,
  )
  .patch(
    "/sub-services/:id/update-time",
    verifyToken,
    subServicesController.updateTime,
  );

module.exports = subServicesRouter;
