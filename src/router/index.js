const express = require("express");

const careersRouter = require("../modules/career");
const localesRouter = require("../modules/locales");
const promoRouter = require("../modules/promo");
const giftRouter = require("../modules/gift");
const orderRouter = require("../modules/order");
const reviewsRouter = require("../modules/reviews");
const usersRouter = require("../modules/users");
const discountsRouter = require("../modules/discounts");
const documentsRouter = require("../modules/documents");
const clientsRouter = require("../modules/clients");
const scheduleRouter = require("../modules/schedule");
const blogsRouter = require("../modules/blogs");

const tasksRouter = require("../modules/tasks");

const router = express.Router();

router
  .use(careersRouter)
  .use(localesRouter)
  .use(promoRouter)
  .use(giftRouter)
  .use(orderRouter)
  .use(tasksRouter)
  .use(reviewsRouter)
  .use(usersRouter)
  .use(discountsRouter)
  .use(documentsRouter)
  .use(clientsRouter)
  .use(scheduleRouter)
  .use(blogsRouter);

module.exports = router;
