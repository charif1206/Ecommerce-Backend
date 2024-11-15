const { Product } = require("../Models/Product");
const Review = require("../models/Review");

exports.getProductReviews = async (req, res) => {
    const {productId} = req.params;
    const reviews = await Review.find({productId})
        .populate("userId", "name profilePicture") // Populate user information like name and email
        .sort({createdAt: -1});

    res.status(200).json(reviews);
};

exports.addReview = async (req, res) => {
    const {productId} = req.params; // Get product ID from URL
    const {rating, comment} = req.body; // Get rating and comment from the body
    const userId = req.user.userId; // Assume the user ID comes from the auth middleware

    // Check if the user has already reviewed this product
    const existingReview = await Review.findOne({productId, userId});
    if (existingReview) {
        return res.status(400).json({message: "You have already reviewed this product."});
    }

    // Create the new review
    const review = new Review({
        userId,
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
        {_id: reviewId, userId: req.user.userId}, // Only allow user to update their own review
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

    // Check if the review exists and if the user is either the review owner or an admin
    if (!review) {
        return res.status(404).json({message: "Review not found"});
    }

    // Check if the user is the owner or an admin
    if (review.userId.toString() !== req.user.userId.toString() && req.user.role !== "admin") {
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
