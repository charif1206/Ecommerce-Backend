const express = require("express");
const cartRouter = express.Router();
const {addToCart, removeFromCart, removeAllFromCart} = require("../Controllers/cartController");
const login = require("../middleware/auth/login");

// Route to add an item to the cart
cartRouter.post("/add", login, addToCart);

// Route to remove an item from the cart
cartRouter.post("/remove", login, removeFromCart);

//Route to remove the the quantity of an item in one go 
cartRouter.post("/remove-all", login, removeAllFromCart);

module.exports = cartRouter;
