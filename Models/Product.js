const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
    {
        ram: {
            type: String,
            required: function () {
                return this.category === "Phones";
            },
        },
        storage: {
            type: String,
            required: function () {
                return this.category === "Phones";
            },
        },
        batteryLife: {
            type: String,
            required: function () {
                return this.category === "Headphones";
            },
        },
        noiseCancellation: {
            type: Boolean,
            required: function () {
                return this.category === "Headphones";
            },
        },
        screenType: {
            type: String,
            required: function () {
                return this.category === "Smartwatches";
            },
        },
        waterResistant: {
            type: Boolean,
            required: function () {
                return this.category === "Smartwatches";
            },
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
         // Disables automatic creation of _id for each variant
    },
     // To ensure that this schema doesn't create its own _id field
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
            minlength: 5,
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
        // reviews: [
        //     {
        //         type: mongoose.Schema.Types.ObjectId,
        //         ref: "Review",
        //     },
        // ],
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
        isSponsored: {
            type: Boolean,
            default: false,
        },
        variants: [variantSchema],
    },
    {timestamps: true}
);

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = {Product};
