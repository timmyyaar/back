const { verifyToken } = require("../../middlewares");

const { Router } = require("express");

const reviewsController = require("./controller");

const reviewsRouter = new Router();

reviewsRouter
  .get("/reviews", reviewsController.getReviews)
  .post("/reviews", verifyToken, reviewsController.createReview)
  .put("/reviews/:id", verifyToken, reviewsController.editReview)
  .delete("/reviews/:id", verifyToken, reviewsController.deleteReview);

module.exports = reviewsRouter;
