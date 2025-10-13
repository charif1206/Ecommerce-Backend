const path = require("path");
const fs = require("fs").promises;
const { cloudinaryUploads, cloudinaryDeletes } = require("../utils/cloudinary");
const { validateProduct } = require("../Validation/productValidation");
const { Product } = require("../Models/Product");

const removeFiles = async (filePaths) => {
    try {
        await Promise.all(filePaths.map((file) => fs.unlink(file)));
    } catch (err) {
        console.error(`Error deleting files: ${err.message}`);
    }
};

/**
 * @route   GET /api/products
 * @desc    Retrieves all products with basic seller information (excluding soft-deleted)
 * @access  Public
 */
module.exports.getAllProducts = async (req, res) => {
    const {
        page = "1",
        limit = "4",
        categories = "",
        sortOrder = "asc",
        searchQuery = "",
    } = req.query;

    // Build filters
    const filters = { isDeleted: { $ne: true } }; // Exclude soft-deleted

    // Process categories filter
    const categoryArray = categories ? categories.split(",") : [];
    if (categoryArray.length > 0) {
        filters.category = { $in: categoryArray };
    }

    // Process search query filter
    if (searchQuery) {
        filters.name = { $regex: searchQuery, $options: "i" };
    }

    // Define sorting options (by price)
    const order = sortOrder === "desc" ? -1 : 1;
    const sortOptions = { price: order };

    try {
        let products, totalProducts, currentPage, pageSize, totalPages;

        // If limit is empty (or explicitly set to "all"), fetch all data
        if (!limit || limit.toLowerCase() === "all") {
            products = await Product.find(filters)
                // .populate("category") // only username and profilePicture
                .populate("seller", "username profilePicture")
                .select("-__v")
                .sort(sortOptions);

            totalProducts = products.length;
            currentPage = 1;
            pageSize = totalProducts;
            totalPages = 1;
        } else {
            const pageNumber = parseInt(page, 10) || 1;
            const parsedLimit = parseInt(limit, 10);
            const effectiveLimit = isNaN(parsedLimit) ? 4 : parsedLimit;

            products = await Product.find(filters)
                .populate("seller", "username profilePicture")
                .select("-__v")
                .skip((pageNumber - 1) * effectiveLimit)
                .limit(effectiveLimit)
                .sort(sortOptions);

            totalProducts = await Product.countDocuments(filters);
            totalPages = Math.ceil(totalProducts / effectiveLimit);
            currentPage = pageNumber;
            pageSize = effectiveLimit;
        }

        res.json({
            products,
            totalProducts,
            totalPages,
            currentPage,
            pageSize,
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

/**
 * @route   GET /api/products/:id
 * @desc    Retrieves a product by its ID with seller details (excluding soft-deleted)
 * @access  Public
 */
module.exports.getProduct = async (req, res) => {
    const product = await Product.findOne({
        _id: req.params.id,
        isDeleted: { $ne: true },
    })
        .populate("seller")
        .select("-__v");

    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }
    res.send(product);
};

/**
 * @route   GET /api/products/seller/:id
 * @desc    Retrieves products for a particular seller (excluding soft-deleted)
 * @access  Public
 */
exports.getSellerProducts = async (req, res) => {
    const { id: sellerId } = req.params;
    const products = await Product.find({
        seller: sellerId,
        isDeleted: { $ne: true },
    });

    return res.status(200).json({ products });
};

/**
 * @route   POST /api/products
 * @desc    Creates a new product with optional variants and image uploads
 * @access  Private (Admin-only access recommended)
 */
module.exports.createProduct = async (req, res) => {
    // Set the seller from the authenticated user (make sure req.user exists)
    req.body.seller = req.user.userId;

    // Convert numeric fields to numbers since they come in as strings
    req.body.price = Number(req.body.price);
    req.body.stock = Number(req.body.stock);

    const files = req.files;
    if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
    }

    // Parse JSON fields if they exist
    req.body.variants = req.body.variants ? JSON.parse(req.body.variants) : {};
    req.body.ratings = req.body.ratings ? JSON.parse(req.body.ratings) : { average: 0, count: 0 };

    // Validate product data (using your existing validateProduct function)
    const { error } = validateProduct(req.body);
    if (error) {
        return res.status(400).send({ error: error.details[0].message });
    }

    // Upload images to Cloudinary (assuming cloudinaryUploads is defined)
    const uploadedImages = await cloudinaryUploads(files.map((file) => file.path));

    // Format the uploaded images for storage in the productImages field
    const productImages = uploadedImages.map((image) => ({
        url: image.secure_url,
        publicId: image.public_id,
    }));
    req.body.productImages = productImages;

    // Create new product (soft-deletion is handled by default in your schema)
    const newProduct = new Product(req.body);
    console.log("New product to be saved:", newProduct);
    const savedProduct = await newProduct.save();

    res.status(201).json({
        message: "Product created successfully",
        product: savedProduct,
    });

    // Cleanup local files after successful upload
    await removeFiles(files.map((file) => file.path));
};

/**
 * @route   PATCH /api/products/toggleLike/:id
 * @desc    Toggles the like status for a product (only if not soft-deleted)
 * @access  Private
 */
module.exports.toggleLike = async (req, res) => {
    const { id: postId } = req.params;
    const { userId } = req.user;

    // Exclude soft-deleted products
    let product = await Product.findOne({
        _id: postId,
        isDeleted: { $ne: true },
    });
    if (!product) {
        return res.status(404).json({ message: "Product not found or deleted" });
    }
    // Check if the user is already in the likes array
    const isLiked = product.likes.includes(userId);
    let post;
    // If the user is already in the likes array, remove them; otherwise, add them
    if (isLiked) {
        post = await Product.findByIdAndUpdate(postId, { $pull: { likes: userId } }, { new: true });
    } else {
        post = await Product.findByIdAndUpdate(postId, { $push: { likes: userId } }, { new: true });
    }

    res.json({ likes: post.likes.length });
};

/**
 * @route   PATCH /api/products/toggleFavorite/:id
 * @desc    Toggles the favorite status for a product (only if not soft-deleted)
 * @access  Private
 */
module.exports.toggleFavorite = async (req, res) => {
    const { id: postId } = req.params;
    const { userId } = req.user;

    // Exclude soft-deleted products
    let product = await Product.findOne({
        _id: postId,
        isDeleted: { $ne: true },
    });
    if (!product) {
        return res.status(404).json({ message: "Product not found or deleted" });
    }

    let post;
    const isFavorited = product.favorites.includes(userId);
    if (isFavorited) {
        post = await Product.findByIdAndUpdate(postId, { $pull: { favorites: userId } }, { new: true });
    } else {
        post = await Product.findByIdAndUpdate(postId, { $push: { favorites: userId } }, { new: true });
    }

    res.json({ favorites: post.favorites.length });
};

/**
 * @route   GET /api/products/liked
 * @desc    Retrieves liked products for the authenticated user (excluding soft-deleted)
 * @access  Private
 */
module.exports.getLikedProducts = async (req, res) => {
    const userId = req.user.userId;

    const likedProducts = await Product.find({
        likes: userId,
        isDeleted: { $ne: true },
    }).populate("seller");

    return res.status(200).json({ products: likedProducts });
};

/**
 * @route   GET /api/products/favorite
 * @desc    Retrieves favorite products for the authenticated user (excluding soft-deleted)
 * @access  Private
 */
module.exports.getFavoriteProducts = async (req, res) => {
    const userId = req.user.userId;

    const favoriteProducts = await Product.find({
        favorites: userId,
        isDeleted: { $ne: true },
    }).populate("seller");

    return res.status(200).json({ products: favoriteProducts });
};

/**
 * @route   PATCH /api/products/:productId
 * @desc    Updates a product by its ID (only if not soft-deleted)
 * @access  Private
 */
exports.updateProduct = async (req, res) => {
    const { productId } = req.params;
    const updateData = req.body;

    // Exclude soft-deleted
    const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId, isDeleted: { $ne: true } },
        updateData,
        { new: true, runValidators: true }
    );

    if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found or has been deleted" });
    }

    return res.status(200).json({ product: updatedProduct });
};

/**
 * @route   DELETE /api/products/:id
 * @desc    Soft-deletes a product by its ID (removes images from Cloudinary, marks isDeleted = true)
 * @access  Private (Admin-only access recommended)
 */
module.exports.deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }

    // Mark product as deleted
    product.isDeleted = true;
    await product.save();

    res.status(200).json({ message: "Product soft-deleted" });
};