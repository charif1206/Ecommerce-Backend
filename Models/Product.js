const mongoose = require("mongoose");
const Joi = require("joi");

// Specification schema for product variants
const SpecificationSchema = new mongoose.Schema({
    storage: {
        type: String,
        enum: ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB", "2 TB"],
    },

    ram: {
        type: String,
        enum: ["2 GB", "4 GB", "8 GB", "16 GB", "32 GB", "64 GB"],
    },

    price: {
        type: Number,
        required: true,
        min: 0,
    },

    // Stock field (required for all products)
    stock: {
        type: Number,
        required: true,
        min: 0,
    },

    batteryLife: {
        type: String,
        match: /^\d+ (hours|days)$/, // Match a number followed by hours or days
    },

    color: {
        type: [String],
    },

    // Noise cancellation field (relevant for Headphones)
    noiseCancellation: {
        type: Boolean,
    },

    // Display type (relevant for Smartwatches)
    displayType: {
        type: String,
        enum: ["AMOLED", "LCD", "OLED"],
    },

    // Water resistance (relevant for Smartwatches and Phones)
    waterResistance: {
        type: Boolean,
    },

    // Connectivity type (relevant for Headphones and Smartwatches)
    connectivityType: {
        type: String,
        enum: ["Bluetooth", "Wired", "Wireless"],
    },
});

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
        subcategory: {
            type: String,
            required: true,
            enum: ["Laptop", "Phones", "Headphones", "Smart Watches"],
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
        reviews: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Review",
            },
        ],
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
        variants: {
            type: [SpecificationSchema],
            id: false,
        },
    },
    {
        timestamps: true,
    }
);

const Product = mongoose.model("Product", productSchema);

const productValidation = Joi.object({
    name: Joi.string().required().min(5).max(255).trim().messages({
        "string.empty": "Product name is required.",
        "string.min": "Product name should be at least 5 characters long.",
        "string.max": "Product name should be less than 255 characters.",
    }),

    brand: Joi.string().required().min(5).max(255).trim().messages({
        "string.empty": "Brand is required.",
        "string.min": "Brand should be at least 5 characters.",
        "string.max": "Brand should be less than 255 characters.",
    }),

    description: Joi.string().required().min(10).trim().messages({
        "string.empty": "Description is required.",
        "string.min": "Description should be at least 10 characters.",
    }),

    subcategory: Joi.string()
        .required()
        .valid("Laptop", "Phones", "Headphones", "Smart Watches")
        .messages({
            "any.only": "Subcategory must be one of Laptop, Phones, Headphones, or Smart Watches.",
        }),

    seller: Joi.string().required().messages({
        "string.empty": "Seller information is required.",
    }),

    variants: Joi.array()
        .items(
            Joi.object({
                storage: Joi.string(),
                ram: Joi.string(),
                price: Joi.number().min(0),
                stock: Joi.number().min(0),
                batteryLife: Joi.string().pattern(/^\d+ (hours|days)$/),
                color: Joi.array().items(Joi.string()),
                noiseCancellation: Joi.boolean(),
                displayType: Joi.string().valid("AMOLED", "LCD", "OLED"),
                waterResistance: Joi.boolean(),
                connectivityType: Joi.string().valid("Bluetooth", "Wired", "Wireless"),
            })
        )
        .required()
        .messages({
            "string.empty": "Variants are required.",
        })
        .min(1),
});

module.exports = {
    Product,
    productValidation,
};
