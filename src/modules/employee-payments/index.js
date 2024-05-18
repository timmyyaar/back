const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const employeePaymentsController = require("./controller");

const employeePaymentsRouter = new Router();

employeePaymentsRouter
  .get(
    "/employee-payments",
    verifyToken,
    employeePaymentsController.getMyPayments
  )
  .post(
    "/employee-payments",
    verifyToken,
    employeePaymentsController.createLastWeekPayment
  )
  .patch(
    "/employee-payments/:id/finish",
    verifyToken,
    employeePaymentsController.finishPayment
  );

module.exports = employeePaymentsRouter;
