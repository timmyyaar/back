const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const clientsController = require("./controller");

const clientsRouter = new Router();

clientsRouter
  .get("/clients", verifyToken, clientsController.getClients)
  .get("/clients/emails", verifyToken, clientsController.getClientsEmails)
  .post("/clients", verifyToken, clientsController.addClient)
  .put("/clients/:id", verifyToken, clientsController.updateClient)
  .delete("/clients/:id", verifyToken, clientsController.deleteClient);

module.exports = clientsRouter;
