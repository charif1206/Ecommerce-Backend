const Cart = require("../Models/Cart");
const {Product} = require("../Models/Product");

// Add an item to the cart
exports.addToCart = async (req, res) => {
    try {
        const {productId} = req.body; // No longer need variantId
        const userId = req.user.userId;

        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        // Check if enough stock is available (one at a time)
        if (product.stock < 1) return res.status(400).send("Out of stock");

        // Find or create the user's cart
        let cart = await Cart.findOne({userId});
        if (!cart) {
            cart = new Cart({userId, items: []});
        }

        // Check if this product is already in the cart
        const existingItem = cart.items.find((item) => item.productId.toString() === productId);

        if (existingItem) {
            // Increment the quantity (one at a time)
            existingItem.quantity += 1;
        } else {
            // Otherwise, add it as a new item with quantity 1 and store its price
            cart.items.push({
                productId,
                quantity: 1,
                price: product.price,
            });
        }

        // Decrement the product's stock by 1
        product.stock -= 1;

        // Recalculate the total price for the cart
        // Here, we assume that each item stores the price at the time it was added.
        let total = 0;
        cart.items.forEach((item) => {
            total += item.price * item.quantity;
        });
        cart.totalPrice = total;

        // Save the updated product and cart documents
        await product.save();
        await cart.save();

        res.status(200).send(cart);
    } catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Remove an item from the cart
exports.removeFromCart = async (req, res) => {
    try {
        const {productId} = req.body; // No variantId needed
        const userId = req.user.userId;

        // Find the product
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        // Find the user's cart
        const cart = await Cart.findOne({userId});
        if (!cart) return res.status(404).send("Cart not found");

        // Locate the item in the cart by productId
        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        if (itemIndex === -1) return res.status(404).send("Item not found in cart");

        const item = cart.items[itemIndex];

        // Decrease the quantity or remove the item completely
        if (item.quantity > 1) {
            item.quantity -= 1; // Decrease quantity by 1
        } else {
            cart.items.splice(itemIndex, 1); // Remove the item from the cart
        }

        // Restore the product's stock by 1 since one item is being removed from the cart
        product.stock += 1;

        // Recalculate the total price for the cart
        let total = 0;
        cart.items.forEach((cartItem) => {
            // We use the product's price as the price for each cart item
            total += product.price * cartItem.quantity;
        });
        cart.totalPrice = total;

        // Save the updates to both product and cart
        await product.save();
        await cart.save();

        res.status(200).json(cart);
    } catch (error) {
        console.error("Error removing product from cart:", error);
        res.status(500).send("Internal server error");
    }
};

// Remove all items of a specific variant from the cart
exports.removeAllFromCart = async (req, res) => {
    try {
        const {productId} = req.body; // No variantId needed
        const userId = req.user.userId;

        // Find the product
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        // Find the user's cart
        const cart = await Cart.findOne({userId});
        if (!cart) return res.status(404).send("Cart not found");

        // Locate the item in the cart by productId
        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        if (itemIndex === -1) return res.status(404).send("Item not found in cart");

        // Get the quantity of the item to restore stock accordingly
        const quantityToRestore = cart.items[itemIndex].quantity;

        // Remove the item completely from the cart
        cart.items.splice(itemIndex, 1);

        // Restore the full stock for the product
        product.stock += quantityToRestore;

        // Recalculate the total price for the cart
        let total = 0;
        cart.items.forEach((cartItem) => {
            total += product.price * cartItem.quantity;
        });
        cart.totalPrice = total;

        // Save the updates to both product and cart
        await product.save();
        await cart.save();

        res.status(200).json(cart);
    } catch (error) {
        console.error("Error removing all items from cart:", error);
        res.status(500).send("Internal server error");
    }
};
