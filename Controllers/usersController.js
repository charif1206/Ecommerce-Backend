const {User} = require("../Models/user");
const {cloudinaryUpload, cloudinaryDelete} = require("../utils/cloudinary");
const fs = require("fs");
const dotenv = require("dotenv");
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
        return res.status(400).json({message: "No file uploaded"});
    }

    let user = await User.findById(req.params.id);
    if (!user) return res.status(400).json({message: "User not found"});

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

    res.status(200).json({message: "Profile picture uploaded", result: result});

    fs.unlinkSync(imagePath);
};

/**
 * @route   DELETE /api/users/:id
 * @desc    Deletes a user by ID and removes their profile picture from Cloudinary
 * @access  Private (Admin-only access)
 */

module.exports.deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).send("User not found");
    }

    if (user.profilePicture.publicId) {
        await cloudinaryDelete(user.profilePicture.publicId);
    }

    await user.remove();
    res.send(user);
};

module.exports.updatePhoneNumber = async (req, res) => {
    const {id} = req.params;
    const {phoneNumber} = req.body;

    // Find the user by ID
    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({message: "User not found"});
    }

    // Update the phone number
    user.phoneNumber = phoneNumber;
    await user.save();

    res.status(200).json({message: "Phone number updated successfully"});
};
