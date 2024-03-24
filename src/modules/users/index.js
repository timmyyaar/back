const { Router } = require("express");
const { verifyToken } = require("../../middlewares");

const usersController = require("./controller");

const usersRouter = new Router();

usersRouter
  .post("/sign-up", usersController.signUp)
  .post("/login", usersController.login)
  .get("/users", verifyToken, usersController.getUsers)
  .post("/users", verifyToken, usersController.createUser)
  .patch("/users/:id/update-role", verifyToken, usersController.updateUserRole)
  .patch(
    "/users/:id/change-password",
    verifyToken,
    usersController.changePassword
  )
  .delete("/users/:id", verifyToken, usersController.deleteUser);

module.exports = usersRouter;
