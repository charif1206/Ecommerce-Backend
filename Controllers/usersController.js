const {User} = require("../Models/user");
const {cloudinaryUpload, cloudinaryDelete} = require("../utils/cloudinary");
const fs = require("fs");

module.exports.getAllUsers = async (req, res) => {
    const users = await User.find();
    res.send(users);
};

module.exports.getUser = async (req, res) => {
    const user = User.findById();
    if (!user) {
        return res.status(404).send("User not found");
    }

    res.send(user);
};

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

    res.status(200).json({message: "Profile picture uploaded", result : result});

    fs.unlinkSync(imagePath);
};
