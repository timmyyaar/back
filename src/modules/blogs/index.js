const { Router } = require("express");

const { verifyToken } = require("../../middlewares");

const blogsController = require("./controller");

const blogsRouter = new Router();

blogsRouter
  .get("/blogs/:id?", blogsController.getBlogs)
  .post("/blogs", verifyToken, blogsController.addBlog)
  .put("/blogs/:id", verifyToken, blogsController.editBlog)
  .delete("/blogs/:id", verifyToken, blogsController.deleteBlog);

module.exports = blogsRouter;
