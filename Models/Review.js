const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 0,
        max: 5,
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 500,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Check if the model already exists, and export it if so
const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

module.exports = {Review}