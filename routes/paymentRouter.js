const express = require("express");
const {createCheckoutSession} = require("../Controllers/paymentController");
const login = require("../middleware/auth/login");
const paymentRouter = express.Router();

paymentRouter.post("/create-checkout-session", login, createCheckoutSession);

module.exports = paymentRouter;
