const express = require("express");
const productRouter = express.Router();
const {upload} = require("../middleware/photoUpload");
const {
    getAllProducts,
    getProduct,
    deleteProduct,
    createProduct,
    toggleLike,
    getLikedProducts,
    toggleFavorite,
    getFavoriteProducts,
    getSellerProducts,
    updateProduct,
} = require("../Controllers/productsController");

const checkRole = require("../middleware/auth/mainRoleCheker");
const login = require("../middleware/auth/login");

productRouter.get("/", getAllProducts);
productRouter.get("/seller/:id", getSellerProducts);
productRouter.get("/liked", login, getLikedProducts);
productRouter.get("/favorites", login, getFavoriteProducts);

productRouter.get("/:id", getProduct);

productRouter.post(
    "/",
    [login, checkRole("seller")],
    upload.array("productImages", 4),
    createProduct
);

productRouter.put("/like/:id", login, toggleLike);
productRouter.put("/favorite/:id", login, toggleFavorite);

productRouter.patch("/:productId", updateProduct);

productRouter.delete("/:id", [login, checkRole("admin")], deleteProduct);
module.exports = productRouter;
