const cloudinary = require("cloudinary");
const dotenv = require("dotenv");

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryUpload = async (fileToUpload) => {
    try {
        const result = await cloudinary.uploader.upload(fileToUpload, {
            upload_preset: "auto",
        });
        return result;
    } catch (error) {
        throw new Error(error);
    }
};

const cloudinaryDelete = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        throw new Error(error.message);
    }
};

const cloudinaryUploads = async (filePaths) => {
    const uploadPromises = filePaths.map((filePath) => cloudinaryUpload(filePath));
    return Promise.all(uploadPromises);
};

const cloudinaryDeletes = async (publicIds) => {
    const deletePromises = publicIds.map((publicId) => cloudinaryDelete(publicId));
    return Promise.all(deletePromises);
};

module.exports = {
    cloudinary,
    cloudinaryUpload,
    cloudinaryDelete,
    cloudinaryUploads,
    cloudinaryDeletes,
};
