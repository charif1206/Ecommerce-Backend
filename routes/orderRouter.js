const express = require("express");
const login = require("../middleware/auth/login");
const {
    getCurrentOrder,
    getCustomerOrders,
    getSellerOrders,
    updateOrderStatus,
} = require("../Controllers/orderController");

const orderRouter = express.Router();

orderRouter.get("/customer", login, getCustomerOrders);

orderRouter.get("/seller", login, getSellerOrders);

orderRouter.get("/:sessionId", login, getCurrentOrder);

orderRouter.patch("/:id/status", login, updateOrderStatus);

module.exports = orderRouter;
