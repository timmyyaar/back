const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const careersController = require("./controller");

const careersRouter = new Router();

careersRouter
  .get("/careers", verifyToken, careersController.getCareers)
  .post("/careers", careersController.createNewCareers)
  .delete("/careers/:id", verifyToken, careersController.deleteCareers);

module.exports = careersRouter;
