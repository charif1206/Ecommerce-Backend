const {Product} = require("../Models/Product");
const Review = require("../models/Review");

// Get all reviews for a product (reviews remain unchanged even if the product is soft-deleted)
exports.getProductReviews = async (req, res) => {
    try {
        const {productId} = req.params;
        const {page = 1, limit = 10} = req.query;
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageSize;

        const reviews = await Review.find({productId})
            .populate("user", "username profilePicture")
            .sort({createdAt: -1})
            .skip(skip)
            .limit(pageSize);

        const totalReviews = await Review.countDocuments({productId});
        const totalPages = Math.ceil(totalReviews / pageSize);

        res.status(200).json({
            reviews,
            page: pageNumber,
            totalPages,
            totalReviews,
        });
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

// Add a review (only if the product exists and is not soft-deleted)
exports.addReview = async (req, res) => {
    const {productId} = req.params; // Get product ID from URL
    const {rating, comment} = req.body; // Get rating and comment
    const user = req.user.userId; // Assume the user ID comes from auth middleware

    // Check if the product exists and is not soft-deleted
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("Product not found");
    if (product.isDeleted) return res.status(400).send("Cannot review a deleted product");

    // Check if the user has already reviewed this product
    const existingReview = await Review.findOne({productId, user});
    if (existingReview) {
        return res.status(400).json({message: "You have already reviewed this product."});
    }

    // Create the new review
    const review = new Review({
        user,
        productId,
        rating,
        comment,
    });

    await review.save();

    // Recalculate the average rating for the product
    const reviews = await Review.find({productId});
    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Update the product's average rating and review count
    product.ratings.average = averageRating;
    product.ratings.count = reviews.length;
    await product.save();

    res.status(201).json(review);
};

// Update a review
exports.updateReview = async (req, res) => {
    const {reviewId} = req.params;
    const {rating, comment} = req.body;

    // Ensure the review belongs to the user
    const review = await Review.findOneAndUpdate(
        {_id: reviewId, user: req.user.userId},
        {rating, comment},
        {new: true}
    );

    if (!review) {
        return res.status(404).json({message: "Review not found or not authorized"});
    }

    // Recalculate the average rating for the product
    const reviews = await Review.find({productId: review.productId});
    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Update the product's average rating and review count
    const product = await Product.findById(review.productId);
    product.ratings.average = averageRating;
    product.ratings.count = reviews.length;
    await product.save();

    res.status(200).json(review);
};

// Delete a review
exports.deleteReview = async (req, res) => {
    const {reviewId} = req.params;

    // Find the review to delete
    const review = await Review.findById(reviewId);
    if (!review) {
        return res.status(404).json({message: "Review not found"});
    }

    // Check if the review belongs to the user or if the user is an admin
    if (review.user.toString() !== req.user.userId.toString() && req.user.role !== "admin") {
        return res.status(403).json({message: "You are not authorized to delete this review"});
    }

    await Review.findByIdAndDelete(reviewId);

    // Recalculate the average rating for the product after deletion
    const reviews = await Review.find({productId: review.productId});
    let averageRating = 0;
    if (reviews.length > 0) {
        const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
        averageRating = totalRating / reviews.length;
    }

    // Update the product's average rating and review count
    const product = await Product.findById(review.productId);
    product.ratings.average = averageRating;
    product.ratings.count = reviews.length;
    await product.save();

    res.status(200).json({message: "Review deleted successfully"});
};
