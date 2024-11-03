const path = require("path");
const fs = require("fs").promises;
const {cloudinaryUploads, cloudinaryDeletes} = require("../utils/cloudinary");

const {validateProduct} = require("../Validation/productValidation");
const {Product} = require("../Models/Product");
const removeFiles = async (filePaths) => {
    try {
        await Promise.all(filePaths.map((path) => fs.unlink(path)));
    } catch (err) {
        console.error(`Error deleting files: ${err.message}`);
    }
};

module.exports.getAllProducts = async (req, res) => {
    const products = await Product.find()
        .populate("seller", "username ,  profilePicture")
        .select("-__v");
    res.send(products);
};

module.exports.getProduct = async (req, res) => {
    const product = await Product.findById(req.params.id).populate("seller").select("-__v");
    if (!product) {
        return res.status(404).json({message: "Product not found"});
    }
    res.send(product);
};

module.exports.deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);

    const images = product.productImages;
    const publicIds = images.map((image) => image.publicId);

    if (publicIds.length > 0) {
        await cloudinaryDeletes(publicIds);
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({message: "Product deleted"});
};

module.exports.createProduct = async (req, res) => {
    const files = req.files;
    console.log(req.body.variants);

    if (req.body.variants) {
        req.body.variants = Array.isArray(req.body.variants)
            ? req.body.variants.map((variant) => JSON.parse(variant)) // Parse each variant string
            : [JSON.parse(req.body.variants)]; // Single variant case
    } else {
        req.body.variants = []; // Default to an empty array if no variants
    }

    const {error} = validateProduct(req.body);

    if (error) {
        await removeFiles(files.map((file) => file.path));
        return res.status(400).send({error: error.details[0].message});
    }

    console.log(req.body);

    if (req.files.length === 0) return res.status(400).json({message: "No files uploaded"});

    if (req.files.length > 4) {
        await removeFiles(files.map((file) => file.path));
        return res.status(400).json({message: "Too many files uploaded. Maximum of 4 allowed."});
    }

    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();
    res.status(201).send({message: "Product created successfully", product: savedProduct});
};
