require("dotenv").config();
const mongoose = require("mongoose");
const Joi = require("joi");

const addressSchema = new mongoose.Schema({
    street: {type: String, trim: true},
    city: {type: String, trim: true},
    state: {type: String, trim: true},
    zip: {type: String, trim: true},
    country: {type: String, trim: true},
});

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 255,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 255,
            trim: true,
            unique: true, // Ensure email uniqueness
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
            maxlength: 255,
        },
        profilePicture: {
            type: Object,
            default: {
                url: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                publicId: null,
            },
        },
        roles: {
            type: String,
            enum: ["customer", "seller", "admin"],
            default: "customer",
            required: true,
            index: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        orderHistory: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Order", // Reference to the Order model
            },
        ],
        wishlist: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
            },
        ],
        likedProducts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
            },
        ],
        coins: {
            type: Number,
            default: 0,
            min: 0,
        },
        coupons: [
            {
                couponCode: {type: String, required: true},
                discount: {type: Number, required: true},
                expirationDate: {type: Date, required: true},
            },
        ],
        address: {
            type: addressSchema,
            default: {},
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        lastLogin: {
            type: Date,
            default: Date.now,
        },
        lastSeen: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

const userValidation = Joi.object({
    username: Joi.string().min(5).max(255).required(),
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(8).max(255).required(),
});

const userUpdateValidation = Joi.object({
    username: Joi.string().min(5).max(255),
    email: Joi.string().min(5).max(255).email(),
    password: Joi.string().min(8).max(255),
});

const passwordResetEmailValidation = Joi.object({
    email: Joi.string().min(5).max(255).required().email(),
});

const passwordResetValidation = Joi.object({
    password: Joi.string().min(8).max(255).required(),
});

const addressValidation = Joi.object({
    street: Joi.string()
        .min(3) // Minimum length for street name
        .max(255) // Maximum length for street name
        .required() // Street is required
        .messages({
            "string.empty": "Street is required.",
            "string.min": "Street must be at least 3 characters long.",
            "string.max": "Street must be less than 256 characters long.",
        }),

    city: Joi.string()
        .min(2) // Minimum length for city name
        .max(100) // Maximum length for city name
        .required() // City is required
        .messages({
            "string.empty": "City is required.",
            "string.min": "City must be at least 2 characters long.",
            "string.max": "City must be less than 101 characters long.",
        }),

    state: Joi.string()
        .min(2) // Minimum length for state name
        .max(100) // Maximum length for state name
        .optional() // State is optional
        .messages({
            "string.empty": "State is optional.",
            "string.min": "State must be at least 2 characters long.",
            "string.max": "State must be less than 101 characters long.",
        }),

    zip: Joi.string()
        .pattern(/^\d{5}(-\d{4})?$/) // Regex for 5-digit or ZIP+4
        .required() // ZIP code is required
        .messages({
            "string.empty": "ZIP code is required.",
            "string.pattern.base": "ZIP code must be a valid format (e.g., 12345 or 12345-6789).",
        }),

    country: Joi.string()
        .min(2) // Minimum length for country name
        .max(100) // Maximum length for country name
        .required() // Country is required
        .messages({
            "string.empty": "Country is required.",
            "string.min": "Country must be at least 2 characters long.",
            "string.max": "Country must be less than 101 characters long.",
        }),

    phoneNumber: Joi.string()
        .pattern(/^\+?[1-9]\d{1,14}$/) // Regex for international phone numbers
        .optional() // Phone number is optional
        .messages({
            "string.pattern.base": "Phone number must be a valid format (e.g., +12345678901).",
        }),
});

module.exports = {
    User,
    userValidation,
    userUpdateValidation,
    passwordResetEmailValidation,
    passwordResetValidation,
    addressValidation,
};
