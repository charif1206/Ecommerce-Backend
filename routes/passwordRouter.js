const express = require("express");
const {
    restPasswordLink,
    verifyRestPasswordLink,
    restPassword,
} = require("../Controllers/passwordController");

const PasswordRouter = express.Router();

PasswordRouter.post("/reset-password", restPasswordLink);

PasswordRouter.get("/reset-password/:id/verify/:token", verifyRestPasswordLink);

PasswordRouter.post("/reset-password/:id/verify/:token", restPassword);

module.exports = PasswordRouter;
