const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const documentsController = require("./controller");

const documentsRouter = new Router();

documentsRouter
  .get("/documents/:id?", verifyToken, documentsController.getDocuments)
  .post("/documents", verifyToken, documentsController.uploadDocument)
  .delete("/documents", verifyToken, documentsController.deleteDocument);

module.exports = documentsRouter;
