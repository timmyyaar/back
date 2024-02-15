const { Router } = require('express');

const giftController = require('./controller');

const giftRouter = new Router();

giftRouter
	.get('/careers', giftController.getGift)
	.post('/careers', giftController.createGift)
	.delete('/careers', giftController.deleteGift);

module.exports = giftRouter;
