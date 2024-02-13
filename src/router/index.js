const express = require('express');

const careersRouter = require('../modules/career');
const localesRouter = require('../modules/locales');
const tasksRouter = require('../modules/tasks');
const promoRouter = require('../modules/promo');

const router = express.Router();

router
	.use(careersRouter)
	.use(localesRouter)
	.use(promoRouter)
	.use(tasksRouter);

module.exports = router;
