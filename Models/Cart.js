const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        price: {
            type: Number,
            required: true,
        },
    },
    {timestamps: true}
);

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        items: [cartItemSchema],
        totalPrice: {
            type: Number,
            default: 0,
            required: true,
        },
    },
    {timestamps: true}
);

// 👇 This prevents the OverwriteModelError during hot reloads or multiple imports
const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

module.exports = {Cart};
