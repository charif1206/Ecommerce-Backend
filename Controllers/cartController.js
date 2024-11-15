const Cart = require("../Models/Cart");
const {Product} = require("../Models/Product");

// Add an item to the cart
exports.addToCart = async (req, res) => {
    const {productId, variantId} = req.body;
    const userId = req.user.userId;

    // Find the product and the specified variant
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("Product not found");

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).send("Variant not found");

    // Check if enough stock is available (decrement one at a time)
    if (variant.stock < 1) return res.status(400).send("Out of stock");

    // Find or create the user's cart
    let cart = await Cart.findOne({userId});
    if (!cart) {
        cart = new Cart({userId, items: []});
    }

    // Check if this variant of the product is already in the cart
    const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId && item.variantId.toString() === variantId
    );

    if (existingItem) {
        // Increment the quantity if it already exists in the cart (still 1 at a time)
        existingItem.quantity += 1;
    } else {
        // Otherwise, add it as a new item (with quantity 1)
        cart.items.push({
            productId,
            variantId,
            quantity: 1,
            price: variant.price, // Store the price here
        });
    }

    // Decrement the stock for this variant by 1 (one at a time)
    variant.stock -= 1;

    // Calculate the total price for the cart
    let total = 0;
    cart.items.forEach((item) => {
        const productVariant = product.variants.id(item.variantId);
        if (productVariant) {
            total += productVariant.price * item.quantity; // Calculate total for this item
        }
    });

    // Save the updates to the product and cart
    await product.save();
    cart.totalPrice = total;
    await cart.save();

    res.status(200).send(cart);
};

// Remove an item from the cart
exports.removeFromCart = async (req, res) => {
    try {
        const {productId, variantId} = req.body;
        const userId = req.user.userId;

        // Find the product and variant
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        const variant = product.variants.id(variantId);
        if (!variant) return res.status(404).send("Variant not found");

        // Find the user's cart
        const cart = await Cart.findOne({userId});
        if (!cart) return res.status(404).send("Cart not found");

        // Locate the item in the cart
        const itemIndex = cart.items.findIndex(
            (item) =>
                item.productId.toString() === productId && item.variantId.toString() === variantId
        );

        if (itemIndex === -1) return res.status(404).send("Item not found in cart");

        const item = cart.items[itemIndex];

        // Decrease the quantity or remove the item
        if (item.quantity > 1) {
            item.quantity -= 1; // Decrease quantity by 1
        } else {
            cart.items.splice(itemIndex, 1); // Completely remove the item
        }

        // Increment the stock for this variant by 1 (since you're removing one)
        variant.stock += 1;

        // Calculate the total price for the cart
        let total = 0;
        cart.items.forEach((item) => {
            const productVariant = product.variants.id(item.variantId);
            if (productVariant) {
                total += productVariant.price * item.quantity; // Calculate total for this item
            }
        });

        // Save the updates to the product and cart
        await product.save(); // Save product to update stock
        await cart.save(); // Save cart to reflect changes

        // Add the total to the response
        cart.totalPrice = total;
        await cart.save();

        res.status(200).json(cart); // Return updated cart
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).send("Internal server error");
    }
};

// Remove all items of a specific variant from the cart
exports.removeAllFromCart = async (req, res) => {
    try {
        const {productId, variantId} = req.body;
        const userId = req.user.userId;

        // Find the product and variant
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        const variant = product.variants.id(variantId);
        if (!variant) return res.status(404).send("Variant not found");

        // Find the user's cart
        const cart = await Cart.findOne({userId});
        if (!cart) return res.status(404).send("Cart not found");

        // Locate the item in the cart
        const itemIndex = cart.items.findIndex(
            (item) =>
                item.productId.toString() === productId && item.variantId.toString() === variantId
        );

        if (itemIndex === -1) return res.status(404).send("Item not found in cart");

        // Get the quantity of the item before deletion for stock restoration
        const quantityToRestore = cart.items[itemIndex].quantity;

        // Remove the item completely from the cart
        cart.items.splice(itemIndex, 1);

        // Restore the full stock for this variant
        variant.stock += quantityToRestore;

        // Calculate the total price for the cart
        let total = 0;
        cart.items.forEach((item) => {
            const productVariant = product.variants.id(item.variantId);
            if (productVariant) {
                total += productVariant.price * item.quantity; // Calculate total for this item
            }
        });

        // Save the updates to the product and cart
        await product.save();
        await cart.save();

        // Add the total to the response
        cart.totalPrice = total;
        await cart.save();

        res.status(200).json(cart); // Return the updated cart
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).send("Internal server error");
    }
};
