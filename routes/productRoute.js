const express = require("express");
const productRouter = express.Router();
const {upload} = require("../middleware/photoUpload");
const {
    getAllProducts,
    getProduct,
    deleteProduct,
    createProduct,
} = require("../Controllers/productsController");

const checkRole = require("../middleware/auth/mainRoleCheker");
const login = require("../middleware/auth/login");

productRouter.get("/", [login, checkRole("admin")], getAllProducts);

productRouter.get("/:id", getProduct);

productRouter.post("/",[login , checkRole("seller")], upload.array("productImages", 4), createProduct);

productRouter.delete("/:id", [login, checkRole("admin")], deleteProduct);
module.exports = productRouter;
