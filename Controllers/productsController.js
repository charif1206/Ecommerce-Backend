const path = require("path");
const fs = require("fs").promises;
const {cloudinaryUploads, cloudinaryDeletes} = require("../utils/cloudinary");

const {validateProduct} = require("../Validation/productValidation");
const {Product} = require("../Models/Product");
const removeFiles = async (filePaths) => {
    try {
        await Promise.all(filePaths.map((path) => fs.unlink(path)));
    } catch (err) {
        console.error(`Error deleting files: ${err.message}`);
    }
};

/**
 * @route   GET /api/products
 * @desc    Retrieves all products with basic seller information
 * @access  Public
 */

// Controller for getting all products with pagination and filtering by brand and category only
// Controller for getting all products with pagination and filtering by brand and category only
module.exports.getAllProducts = async (req, res) => {
    // Destructure the query parameters
    const {page = 1, limit = 12, categories = "", sortOrder = "asc", searchQuery = ""} = req.query;

    // Parse the categories query parameter into an array if it's a string
    const categoryArray = categories ? categories.split(",") : [];

    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    const filters = {};

    // Apply the categories filter if any categories are provided
    if (categoryArray.length > 0) {
        filters.category = {$in: categoryArray};
    }

    // Apply the search query filter if provided
    if (searchQuery) {
        filters.name = {$regex: searchQuery, $options: "i"}; // Case-insensitive search by product name
    }

    console.log(filters);

    // Sorting options (price)
    const order = sortOrder === "desc" ? -1 : 1;
    const sortOptions = {price: order};

    try {
        // Fetch products from the database based on the filters and pagination
        const products = await Product.find(filters)
            .populate("seller", "username profilePicture")
            .select("-__v")
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            .sort(sortOptions);

        const totalProducts = await Product.countDocuments(filters);
        const totalPages = Math.ceil(totalProducts / pageSize);

        res.json({
            products,
            totalProducts,
            totalPages,
            currentPage: pageNumber,
            pageSize,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "An error occurred while fetching products."});
    }
};

/**
 * @route   GET /api/products/:id
 * @desc    Retrieves a product by its ID with seller details
 * @access  Public
 */

module.exports.getProduct = async (req, res) => {
    const product = await Product.findById(req.params.id).populate("seller").select("-__v");
    if (!product) {
        return res.status(404).json({message: "Product not found"});
    }
    res.send(product);
};

/**
    @route   POST /api/products
    @desc    Creates a new product with optional variants and image uploads
    @access  Private (Admin-only access recommended)
*/

module.exports.createProduct = async (req, res) => {
    try {
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({message: "No files uploaded"});
        }

        // Parse JSON fields if they exist
        req.body.variants = req.body.variants ? JSON.parse(req.body.variants) : {};
        req.body.ratings = req.body.ratings ? JSON.parse(req.body.ratings) : {average: 0, count: 0};

        // Validate product data
        const {error} = validateProduct(req.body);
        if (error) {
            return res.status(400).send({error: error.details[0].message});
        }

        // Upload images to Cloudinary
        const uploadedImages = await cloudinaryUploads(files.map((file) => file.path));

        // Format the uploaded images for storage
        const productImages = uploadedImages.map((image) => ({
            url: image.secure_url,
            publicId: image.public_id,
        }));

        // Attach product images to the request
        req.body.productImages = productImages;

        // Save the new product
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();

        res.status(201).json({message: "Product created successfully", product: savedProduct});

        // Cleanup local files after successful upload
        await removeFiles(files);
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({message: "Internal server error", error: error.message});
    }
};

/**
    @route   DELETE /api/products/:id
    @desc    Deletes a product by its ID and removes associated images from Cloudinary
    @access  Private (Admin-only access recommended)
*/
module.exports.deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);

    const images = product.productImages;
    const publicIds = images.map((image) => image.publicId);

    if (publicIds.length > 0) {
        await cloudinaryDeletes(publicIds);
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({message: "Product deleted"});
};

// module.exports.createProduct = async (req, res) => {
//     const files = req.files;

//     if (req.body.variants) {
//         req.body.variants = Array.isArray(req.body.variants)
//             ? req.body.variants.map((variant) => JSON.parse(variant)) // Parse each variant string
//             : [JSON.parse(req.body.variants)]; // Single variant case
//     } else {
//         req.body.variants = []; // Default to an empty array if no variants
//     }

//     const {error} = validateProduct(req.body);

//     if (error) {
//         await removeFiles(files.map((file) => file.path));
//         return res.status(400).send({error: error.details[0].message});
//     }

//     // if (req.files.length === 0) return res.status(400).json({message: "No files uploaded"});

//     if (req.files.length > 4) {
//         await removeFiles(files.map((file) => file.path));
//         return res.status(400).json({message: "Too many files uploaded. Maximum of 4 allowed."});
//     }

//     const newProduct = new Product(req.body);
//     const savedProduct = await newProduct.save();
//     res.status(201).send({message: "Product created successfully", product: savedProduct});
// };
