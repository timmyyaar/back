const { Router } = require('express');

const giftController = require('./controller');

const giftRouter = new Router();

giftRouter
	.get('/gift', giftController.getGift)
	.post('/gift', giftController.createGift)
	.delete('/gift', giftController.deleteGift);

module.exports = giftRouter;
