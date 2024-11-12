const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const settingsController = require("./controller");

const settingsRouter = new Router();

settingsRouter
  .get("/settings", verifyToken, settingsController.getSettings)
  .patch("/settings/:id", verifyToken, settingsController.changeSettingValue);

module.exports = settingsRouter;
