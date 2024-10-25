const express = require("express");
const productRouter = express.Router();
const {upload} = require("../middleware/photoUpload");
const {createProduct} = require("../Controllers/productsController");

productRouter.post("/create-product", upload.array("productImages"), createProduct);

module.exports = productRouter;
