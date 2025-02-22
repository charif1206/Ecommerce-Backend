const express = require("express");
const {createCheckoutSession, checkoutSuccess, createSellerUpgrade} = require("../Controllers/paymentController");
const login = require("../middleware/auth/login");
const paymentRouter = express.Router();

paymentRouter.post("/create-checkout-session", login, createCheckoutSession);

paymentRouter.post("/create-seller-upgrade", login, createSellerUpgrade);

paymentRouter.post("/checkout-success", login, checkoutSuccess);

module.exports = paymentRouter;
