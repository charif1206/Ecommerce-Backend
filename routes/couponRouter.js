const express = require("express");
const login = require("../middleware/auth/login");
const {redeemCoupon, getUserCoupons, validateCoupon} = require("../Controllers/couponController");

const couponRouter = express.Router();

couponRouter.get("/", login, getUserCoupons);

couponRouter.post("/redeem", login, redeemCoupon);

couponRouter.post("/validate-coupon", login, validateCoupon);

module.exports = couponRouter;
