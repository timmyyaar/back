const { Router } = require("express");

const reviewsController = require("./controller");

const reviewsRouter = new Router();

reviewsRouter
  .get("/reviews", reviewsController.getReviews)
  .post("/reviews", reviewsController.createReview)
  .put("/reviews/:id", reviewsController.editReview)
  .delete("/reviews/:id", reviewsController.deleteReview);

module.exports = reviewsRouter;
