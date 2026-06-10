const {Product} = require("../Models/Product");
const {Cart} = require("../Models/Cart");

// Get the current user's cart. If it doesn't exist, create a new empty cart.
exports.getUserCart = async (req, res) => {
    try {
        const userId = req.user.userId; // Get userId from authenticated request

        // Find the user's cart and populate product details in each cart item
        let cart = await Cart.findOne({userId}).populate("items.productId");

        // If no cart exists, create a new one
        if (!cart) {
            cart = new Cart({userId, items: [], totalPrice: 0});
            await cart.save();
        }

        res.status(200).json(cart);
    } catch (error) {
        console.error("Error fetching the cart:", error);
        res.status(500).send("Internal server error");
    }
};

// Add an item to the cart
exports.addToCart = async (req, res) => {
    const {productId, quantity} = req.body;
    const userId = req.user.userId;

    // Validate quantity
    if (!quantity || quantity < 1) {
        return res.status(400).send("Invalid quantity");
    }

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("Product not found");

    // Check if product is soft-deleted
    if (product.isDeleted) {
        return res.status(404).send("Product not available");
    }

    // Check stock availability
    if (product.stock < quantity) {
        return res.status(400).json({message: "Out Of Stock"});
    }

    // Find or create the user's cart
    let cart = await Cart.findOne({userId});
    if (!cart) {
        cart = new Cart({userId, items: []});
    }

    // Check if product exists in cart
    const existingItem = cart.items.find((item) => item.productId.toString() === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.items.push({
            productId,
            quantity,
            price: product.price,
        });
    }

    // Update product stock
    product.stock -= quantity;

    // Recalculate total price
    cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

    // Save changes
    await product.save();
    await cart.save();

    res.status(200).json(cart);
};

// Remove one unit of an item from the cart
exports.removeFromCart = async (req, res) => {
    const {productId} = req.body; // No variantId needed
    const userId = req.user.userId;

    // Find the product (regardless of soft-deleted status)
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("Product not found");

    // Find the user's cart
    const cart = await Cart.findOne({userId});
    if (!cart) return res.status(404).send("Cart not found");

    // Locate the item in the cart by productId
    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
    if (itemIndex === -1) return res.status(404).send("Item not found in cart");

    const item = cart.items[itemIndex];

    // Decrease the quantity by 1 or remove the item if quantity becomes 0
    if (item.quantity > 1) {
        item.quantity -= 1;
    } else {
        cart.items.splice(itemIndex, 1);
    }

    // Restore the product's stock by 1
    product.stock += 1;

    // Recalculate the total price for the cart
    cart.totalPrice = cart.items.reduce(
        (total, cartItem) => total + cartItem.price * cartItem.quantity,
        0
    );

    // Save the updates
    await product.save();
    await cart.save();

    res.status(200).json(cart);
};

// Remove all units of a specific product from the cart
exports.removeAllFromCart = async (req, res) => {
    try {
        const {productId} = req.body; // No variantId needed
        const userId = req.user.userId;

        // Find the product (regardless of soft-deleted status)
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        // Find the user's cart
        const cart = await Cart.findOne({userId});
        if (!cart) return res.status(404).send("Cart not found");

        // Locate the item in the cart by productId
        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        if (itemIndex === -1) return res.status(404).send("Item not found in cart");

        // Get the quantity to restore the product's stock
        const quantityToRestore = cart.items[itemIndex].quantity;

        // Remove the item completely from the cart
        cart.items.splice(itemIndex, 1);

        // Restore the product's stock by the removed quantity
        product.stock += quantityToRestore;

        // Recalculate the cart's total price
        cart.totalPrice = cart.items.reduce(
            (total, cartItem) => total + cartItem.price * cartItem.quantity,
            0
        );

        // Save the updates
        await product.save();
        await cart.save();

        res.status(200).json(cart);
    } catch (error) {
        console.error("Error removing all items from cart:", error);
        res.status(500).send("Internal server error");
    }
};
