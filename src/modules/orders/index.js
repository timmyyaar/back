const { Router } = require('express');

const ordersController = require('./controller');

const ordersRouter = new Router();

ordersRouter
	.get('/orders', ordersController.getOrders)
	.post('/orders', ordersController.createNewOrder)
	.delete('/orders', ordersController.deleteOrder);

module.exports = ordersRouter;
