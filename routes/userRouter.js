const express = require("express");
const {getAllUsers} = require("../Controllers/usersController");

const userRouter = express.Router();

userRouter.get("/", getAllUsers);

module.exports = userRouter;
