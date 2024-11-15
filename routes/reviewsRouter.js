const express = require("express");
const login = require("../middleware/auth/login");
const {getProductReviews, addReview, updateReview, deleteReview} = require("../Controllers/reviewsController");

const reviewRouter = express.Router();

reviewRouter.get("/:productId", getProductReviews);

reviewRouter.post("/:productId", login, addReview);

reviewRouter.put("/:reviewId", login, updateReview);

reviewRouter.delete("/:reviewId", login, deleteReview);

module.exports = reviewRouter;
