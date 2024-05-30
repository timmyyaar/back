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
  .get(
    "/employee-payments/all",
    verifyToken,
    employeePaymentsController.getAllPayments
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
  )
  .patch(
    "/employee-payments/:id/update-amount",
    verifyToken,
    employeePaymentsController.updatePaymentAmount
  );

module.exports = employeePaymentsRouter;
