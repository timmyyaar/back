const express = require('express');

const careersRouter = require('../modules/career');
const localesRouter = require('../modules/locales');
const promoRouter = require('../modules/promo');
const giftRouter = require('../modules/gift');

const tasksRouter = require('../modules/tasks');

const router = express.Router();

router
	.use(careersRouter)
	.use(localesRouter)
	.use(promoRouter)
	.use(giftRouter)
	.use(tasksRouter);

module.exports = router;
