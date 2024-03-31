const { Router } = require("express");
const { verifyToken } = require("../../middlewares");

const usersController = require("./controller");

const usersRouter = new Router();

usersRouter
  .post("/sign-up", usersController.signUp)
  .post("/login", usersController.login)
  .get("/users", verifyToken, usersController.getUsers)
  .get("/users/my-user", verifyToken, usersController.getMyUser)
  .post("/users", verifyToken, usersController.createUser)
  .patch("/users/:id/update-role", verifyToken, usersController.updateUserRole)
  .patch(
    "/users/:id/change-password",
    verifyToken,
    usersController.changePassword
  )
  .patch(
    "/users/:id/update-details",
    verifyToken,
    usersController.updateUserDetails
  )
  .patch(
    "/users/:id/update-rating",
    verifyToken,
    usersController.updateUserRating
  )
  .delete("/users/:id", verifyToken, usersController.deleteUser);

module.exports = usersRouter;
