const path = require("path");
const fs = require("fs").promises;
const {cloudinaryUploads} = require("../utils/cloudinary");
const {productValidation, Product} = require("../Models/Product");

const removeFiles = async (filePaths) => {
    try {
        await Promise.all(filePaths.map((path) => fs.unlink(path)));
    } catch (err) {
        console.error(`Error deleting files: ${err.message}`);
    }
};



module.exports.createProduct = async (req, res) => {
    req.body.variants = JSON.parse(req.body.variants);

    console.log(req.body);

    const {error} = productValidation.validate(req.body);
    if (error) return res.status(400).json({message: error.details[0].message});

    const files = req.files;

    if (files.length > 4) {
        await removeFiles(files.map((file) => file.path));
        return res.status(400).json({message: "Too many files uploaded. Maximum of 4 allowed."});
    }
    if (!files || files.length === 0) return res.status(400).json({message: "No files uploaded."});

    // Upload images to Cloudinary
    const uploadResults = await cloudinaryUploads(files.map((file) => file.path));

    // Map Cloudinary upload results, filtering any unsuccessful uploads
    const images = uploadResults
        .filter((result) => result && result.secure_url && result.public_id)
        .map((result) => ({
            url: result.secure_url,
            publicId: result.public_id,
        }));

    // Handle cases where uploads failed
    if (images.length === 0) {
        await removeFiles(files.map((file) => file.path));
        return res.status(500).json({message: "Image upload failed."});
    }

    // Create and save the new product
    const product = new Product({
        ...req.body,
        productImages: images,
    });

    await product.save();

    // Delete uploaded files
    await removeFiles(files.map((file) => file.path));
    // Return the newly created product info
    res.status(201).json({
        message: "Product created successfully!",
        product,
    });
};
