const Joi = require("joi");

// Define the base schema with common fields
const baseSchema = Joi.object({
    name: Joi.string().min(5).max(255).trim().required().messages({
        "string.min": "Product name should have at least 5 characters.",
        "string.max": "Product name should not exceed 255 characters.",
        "any.required": "Product name is required.",
    }),

    brand: Joi.string().min(5).max(255).trim().required().messages({
        "string.min": "Brand should have at least 5 characters.",
        "string.max": "Brand should not exceed 255 characters.",
        "any.required": "Brand is required.",
    }),

    seller: Joi.string().required().messages({
        "any.required": "Seller is required.",
    }),

    description: Joi.string().max(255).trim().messages({
        "string.max": "Description should not exceed 255 characters.",
    }),

    productImages: Joi.required().messages({
        "any.required": "Product image is required.",
    }),

    category: Joi.string().valid("Phones", "Headphones", "Smartwatches").required().messages({
        "any.only": "Category must be one of Phones, Headphones, or Smartwatches.",
        "any.required": "Category is required.",
    }),

    ratings: Joi.object({
        average: Joi.number().min(0).max(5).default(0).optional(),
        count: Joi.number().min(0).default(0).optional(),
    }).optional(),
});

// Category-specific schemas that extend the base schema
const schemas = {
    Phones: baseSchema.keys({
        variants: Joi.array()
            .items(
                Joi.object({
                    ram: Joi.string().required().messages({
                        "any.required": "RAM is required for Phones.",
                    }),
                    storage: Joi.string().required().messages({
                        "any.required": "Storage is required for Phones.",
                    }),
                    price: Joi.number().required().min(0).messages({
                        "any.required": "Price is required for phones.",
                        "number.min": "Price must be a positive number.",
                    }),
                    stock: Joi.number().required().min(0).messages({
                        "any.required": "Stock is required for phones.",
                        "number.min": "Stock must be a non-negative number.",
                    }),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.min": "Phones must have at least one variant with RAM and storage.",
            }),
    }),
    Headphones: baseSchema.keys({
        variants: Joi.array()
            .items(
                Joi.object({
                    batteryLife: Joi.string().required().messages({
                        "any.required": "Battery life is required for Headphones.",
                    }),
                    noiseCancellation: Joi.boolean().required().messages({
                        "any.required": "Noise cancelling is required for Headphones.",
                    }),
                    price: Joi.number().required().min(0).messages({
                        "any.required": "Price is required for Headphones.",
                        "number.min": "Price must be a positive number.",
                    }),
                    stock: Joi.number().required().min(0).messages({
                        "any.required": "Stock is required for Headphones.",
                        "number.min": "Stock must be a non-negative number.",
                    }),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.min": "Headphones must have at least one variant.",
            }),
    }),
    Smartwatches: baseSchema.keys({
        variants: Joi.array()
            .items(
                Joi.object({
                    screenType: Joi.string().optional().messages({
                        "string.base": "Screen type must be a string.",
                    }),
                    waterResistant: Joi.boolean().optional().messages({
                        "boolean.base": "Water resistance must be a boolean.",
                    }),
                    price: Joi.number().required().min(0).messages({
                        "any.required": "Price is required for phones.",
                        "number.min": "Price must be a positive number.",
                    }),
                    stock: Joi.number().required().min(0).messages({
                        "any.required": "Stock is required for phones.",
                        "number.min": "Stock must be a non-negative number.",
                    }),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.min": "Smartwatches must have at least one variant.",
            }),
    }),
};

const allowedCategories = Object.keys(schemas);

const validateProduct = (data) => {
    const category = data.category && data.category.trim(); 

    // Check if category exists and is one of the allowed values
    if (!category || !allowedCategories.includes(category)) {
        throw new Error(
            `Invalid or missing category. Allowed categories are: ${allowedCategories.join(", ")}.`
        );
    }

    // Select the corresponding schema for the validated category
    const schema = schemas[category];

    // Confirm that schema exists for this category
    if (!schema) {
        throw new Error(`Validation schema for category "${category}" does not exist.`);
    }

    // Validate data against the selected schema
    return schema.validate(data);
};

// Export schemas and validation function
module.exports = {schemas, validateProduct};
