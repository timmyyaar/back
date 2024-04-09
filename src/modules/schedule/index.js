const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const scheduleController = require("./controller");

const scheduleRouter = new Router();

scheduleRouter
  .get("/schedule/:id?", verifyToken, scheduleController.getSchedule)
  .post("/schedule/:id?", verifyToken, scheduleController.addSchedule)
  .put("/schedule/:id", verifyToken, scheduleController.editSchedule);

module.exports = scheduleRouter;
