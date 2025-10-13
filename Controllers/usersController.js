const { User } = require("../Models/user");
const { cloudinaryUpload, cloudinaryDelete } = require("../utils/cloudinary");
const fs = require("fs");
const dotenv = require("dotenv");
const { Cart } = require("../Models/cart");
const { Coupon } = require("../Models/coupon");
const { Product } = require("../Models/Product");
const { Review } = require("../Models/review");
dotenv.config();

/**
 * @route   GET /api/users
 * @desc    Retrieves a list of all users excluding passwords
 * @access  Private (Admin-only access)
 */

module.exports.getAllUsers = async (req, res) => {
    const users = await User.find().lean().select("-password");

    res.json(users);
};

/**
    @route   GET /api/users/:id
 *  @desc    Retrieves a user by ID
 *  @access  Private (Admin-only access)
 */

module.exports.getUser = async (req, res) => {
    const user = await User.findById(req.params.id).lean().select("-password");
    if (!user) {
        return res.status(404).send("User not found");
    }

    res.send(user);
};

/**
 * @route   PUT /api/users/:id/profile/upload-profile-picture
 * @desc    Uploads a new profile picture for a user and deletes the old one from Cloudinary
 * @access  Private (Customers and above );
 */

module.exports.uploadeProfilePicture = async (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    let user = await User.findById(req.params.id);
    if (!user) return res.status(400).json({ message: "User not found" });

    const imagePath = file.path;

    const result = await cloudinaryUpload(imagePath);

    if (user.profilePicture.publicId) {
        await cloudinaryDelete(user.profilePicture.publicId);
    }

    user.profilePicture = {
        url: result.secure_url,
        public_id: result.public_id,
    };

    await user.save();

    res.status(200).json({ message: "Profile picture uploaded", result: result });

    fs.unlinkSync(imagePath);
};

/**
 * @route   DELETE /api/users/:id
 * @desc    Deletes a user by ID and removes their profile picture from Cloudinary
 * @access  Private (Admin-only access)
 */

module.exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // 1. Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send("User not found");
        }

        // 2. Delete the user's profile picture from Cloudinary if it exists
        if (user.profilePicture?.publicId) {
            await cloudinaryDelete(user.profilePicture.publicId);
        }

        // 3. Process reviews:
        // 3.1 Find all reviews authored by the user.
        const userReviews = await Review.find({ user: userId });
        const productIds = [...new Set(userReviews.map((review) => review.productId.toString()))];

        // 3.2 Remove all reviews by the user.
        await Review.deleteMany({ user: userId });

        // 3.3 Recalculate ratings for each affected product.
        for (const productId of productIds) {
            const remainingReviews = await Review.find({ productId });
            const count = remainingReviews.length;
            let average = 0;
            if (count > 0) {
                const total = remainingReviews.reduce((sum, review) => sum + review.rating, 0);
                average = total / count;
            }
            await Product.findByIdAndUpdate(productId, {
                "ratings.count": count,
                "ratings.average": average,
            });
        }

        // 4. Mark all products owned by the user as deleted.
        await Product.updateMany({ seller: userId }, { isDeleted: true });

        // 5. Remove the user from products' likes and favorites arrays.
        await Product.updateMany({ likes: userId }, { $pull: { likes: userId } });
        await Product.updateMany({ favorites: userId }, { $pull: { favorites: userId } });

        await Cart.deleteOne({ user: userId });
        await Coupon.deleteMany({ user: userId });

        // 7. Finally, delete the user document.
        await user.deleteOne();

        return res
            .status(200)
            .send(
                `User (ID: ${userId}) was deleted. Their reviews were removed and product data updated accordingly.`
            );
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).send(error.message);
    }
};

module.exports.updatePhoneNumber = async (req, res) => {
    const { id } = req.params;
    const { phoneNumber } = req.body;

    // Find the user by ID
    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Update the phone number
    user.phoneNumber = phoneNumber;
    await user.save();

    res.status(200).json({ message: "Phone number updated successfully" });
};
