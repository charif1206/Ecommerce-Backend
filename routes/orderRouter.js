const express = require("express");
const login = require("../middleware/auth/login");
const { getCurrentOrder } = require("../Controllers/orderController");

const orderRouter = express.Router();

orderRouter.get("/:sessionId", login, getCurrentOrder);



module.exports = orderRouter;
