const { Router } = require("express");
const { verifyToken } = require("../../middlewares");

const usersController = require("./controller");

const usersRouter = new Router();

usersRouter
  .post("/sign-up", usersController.signUp)
  .post("/login", usersController.login)
  .post("/logout", usersController.logOut)
  .get("/users", verifyToken, usersController.getUsers)
  .get("/users/my-user", verifyToken, usersController.getMyUser)
  .post("/users", verifyToken, usersController.createUser)
  .put("/users/:id", verifyToken, usersController.updateUser)
  .patch(
    "/users/:id/change-password",
    verifyToken,
    usersController.changePassword
  )
  .patch(
    "/users/:id/update-rating",
    verifyToken,
    usersController.updateUserRating
  )
  .delete("/users/:id", verifyToken, usersController.deleteUser);

module.exports = usersRouter;
