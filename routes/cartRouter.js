const express = require("express");
const cartRouter = express.Router();
const {
    addToCart,
    removeFromCart,
    removeAllFromCart,
    getUserCart,
} = require("../Controllers/cartController");
const login = require("../middleware/auth/login");

cartRouter.get("/", login, getUserCart);

// Route to add an item to the cart
cartRouter.post("/add", login, addToCart);

// Update a cart item (e.g., remove one unit from an item)
// Using PATCH to indicate a partial update to the cart item.
cartRouter.patch("/remove", login, removeFromCart);

// Remove all units of a specific product from the cart
// Using DELETE to indicate removal of the item completely.
cartRouter.delete("/remove-all", login, removeAllFromCart);

module.exports = cartRouter;
