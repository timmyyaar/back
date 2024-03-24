const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const localesController = require("./controller");

const localesRouter = new Router();

localesRouter
  .get("/locales", localesController.getLocales)
  .post("/locales", verifyToken, localesController.createNewLocale)
  .put("/locales", verifyToken, localesController.editOldLocale)
  .delete("/locales", verifyToken, localesController.deleteLocale);

module.exports = localesRouter;
