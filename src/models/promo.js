const { Schema, model } = require('mongoose');

const TaskSchema = new Schema({
	code: {
		type: String,
		required: true,
	},
	description: {
		type: String,
	},
});

module.exports = model('Task', TaskSchema);
