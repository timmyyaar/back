const { Router } = require('express');

const orderController = require('./controller');

const orderRouter = new Router();

orderRouter
	.get('/order', orderController.getOrder)
	.post('/order', orderController.createOrder)
	.delete('/order', orderController.deleteOrder);

module.exports = orderRouter;
