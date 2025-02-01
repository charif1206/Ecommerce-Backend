const {Product} = require("../Models/Product");
const Review = require("../models/Review");

// Get all reviews for a product

exports.getProductReviews = async (req, res) => {
    try {
        const {productId} = req.params;
        // Get page and limit from query parameters, defaulting to page 1 and limit 10
        const {page = 1, limit = 10} = req.query;
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageSize;

        // Get paginated reviews
        const reviews = await Review.find({productId})
            .populate("user", "username profilePicture") // Populate user info
            .sort({createdAt: -1})
            .skip(skip)
            .limit(pageSize);

        // Get total count and calculate total pages
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

exports.addReview = async (req, res) => {
    const {productId} = req.params; // Get product ID from URL
    const {rating, comment} = req.body; // Get rating and comment from the body
    const user = req.user.userId; // Assume the user ID comes from the auth middleware

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
    const product = await Product.findById(productId);
    product.ratings.average = averageRating;
    product.ratings.count = reviews.length;
    await product.save();

    res.status(201).json(review); // Return the created review
};

exports.updateReview = async (req, res) => {
    const {reviewId} = req.params; // Get review ID from the URL
    const {rating, comment} = req.body; // Get updated rating and comment

    // Ensure the review belongs to the user
    const review = await Review.findOneAndUpdate(
        {_id: reviewId, user: req.user.userId}, // Only allow user to update their own review
        {rating, comment},
        {new: true} // Return the updated review
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

exports.deleteReview = async (req, res) => {
    const {reviewId} = req.params; // Get review ID from the URL

    // Find the review to delete
    const review = await Review.findById(reviewId);

    console.log(req.user.userId.toString(), review.user.toString());
    

    // Check if the review exists and if the user is either the review owner or an admin
    if (!review) {
        return res.status(404).json({message: "Review not found"});
    }

    

    // Check if the user is the owner or an admin
    if (review.user.toString() !== req.user.userId.toString() && req.user.role !== "admin") {
        return res.status(403).json({message: "You are not authorized to delete this review"});
    }

    // Delete the review
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
