const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
    {
        ram: {
            type: String,
            required: function () {
                return this.category === "Phones"; // Only required if category is "Phones"
            },
        },
        storage: {
            type: String,
            required: function () {
                return this.category === "Phones"; // Only required if category is "Phones"
            },
        },
        batteryLife: {
            type: String,
            required: function () {
                return this.category === "Headphones"; // Only required if category is "Headphones"
            },
        },
        noiseCancellation: {
            type: Boolean,
            required: function () {
                return this.category === "Headphones"; // Only required if category is "Headphones"
            },
        },
        screenType: {
            type: String,
            required: function () {
                return this.category === "Smartwatches"; // Only required if category is "Smartwatches"
            },
        },
        waterResistant: {
            type: Boolean,
            required: function () {
                return this.category === "Smartwatches"; // Only required if category is "Smartwatches"
            },
        },
    },
    {_id: false} // To disable _id creation for variants
);

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 255,
            trim: true,
        },
        brand: {
            type: String,
            required: true,
            minlength: 3,
            maxlength: 255,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            minlength: 10,
            trim: true,
        },
        category: {
            type: String,
            enum: ["Phones", "Headphones", "Smartwatches"],
            required: true,
        },
        productImages: [
            {
                url: {
                    type: String,
                    required: true,
                },
                publicId: {
                    type: String,
                    required: true,
                },
                _id: false,
            },
        ],
        ratings: {
            average: {
                type: Number,
                default: 0,
                min: 0,
                max: 5,
            },
            count: {
                type: Number,
                default: 0,
                min: 0,
            },
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        favorites: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        isSponsored: {
            type: Boolean,
            default: false,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        stock: {
            type: Number,
            required: true,
            min: 0,
        },
        variants: variantSchema,
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {timestamps: true}
);

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

module.exports = {Product};
