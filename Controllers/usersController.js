const {User} = require("../Models/user");
const {cloudinaryUpload, cloudinaryDelete} = require("../utils/cloudinary");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const dotenv = require("dotenv");

dotenv.config();

const FACE_API_URL = "https://api-us.faceplusplus.com/facepp/v3/compare";

module.exports.getAllUsers = async (req, res) => {
    const users = await User.find().lean().select("-password");
    res.json(users);
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

    res.status(200).json({message: "Profile picture uploaded", result: result});

    fs.unlinkSync(imagePath);
};

// module.exports.faceRecognition = async (req, res) => {
//     console.log(req.files); // Debugging: log uploaded files

//     if (!req.files || req.files.length !== 2) {
//         return res.status(400).json({message: "Exactly two images must be uploaded"});
//     }

//     const imagePaths = req.files.map((file) => file.path);

//     if (!fs.existsSync(imagePaths[0]) || !fs.existsSync(imagePaths[1])) {
//         return res.status(400).json({message: "One or more images could not be found"});
//     }

//     console.log(fs.createReadStream(imagePaths[1]));

//     try {
//         const formData = new FormData();
//         formData.append("api_key", process.env.FACE_API_KEY);
//         formData.append("api_secret", process.env.FACE_API_SECRET);
//         formData.append("image_file_1", fs.createReadStream(imagePaths[0])); // First image
//         formData.append("image_file_2", fs.createReadStream(imagePaths[1])); // Second image

//         const response = await axios.post(FACE_API_URL, formData, {
//             headers: {
//                 ...formData.getHeaders(),
//             },
//         });

//         await Promise.all(imagePaths.map((filePath) => fs.promises.unlink(filePath)));
//         res.status(200).json(response.data);
//     } catch (error) {
//         console.error("Error processing images:", error);
//         if (error.response) {
//             console.error("Error details:", error.response.data);
//             return res
//                 .status(error.response.status)
//                 .json({message: "Error processing images", error: error.response.data});
//         }
//         res.status(500).json({message: "Error processing images", error: error.message});
//     }
// };

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
