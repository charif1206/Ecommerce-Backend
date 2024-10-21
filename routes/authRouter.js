const express = require("express");
const {Login, Register, Logout, VerifyLink, googleAuth} = require("../Controllers/authController");

const authRouter = express.Router();

authRouter.get("/:id/verify/:token", VerifyLink);

authRouter.post("/login", Login);

authRouter.post("/google-login", googleAuth);

authRouter.post("/google-register", googleAuth);

authRouter.post("/register", Register);

authRouter.post("/logout", Logout);

module.exports = authRouter;
