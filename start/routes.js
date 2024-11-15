const authRouter = require("../routes/authRouter");
const PasswordRouter = require("../routes/passwordRouter");
const productRouter = require("../routes/productRoute");
const userRouter = require("../routes/userRouter");
const reviewsRouter = require("../routes/reviewsRouter");
const cartRouter = require("../routes/cartRouter");

const routes = (app) => {
    app.use("/api/auth", authRouter);
    app.use("/api/password", PasswordRouter);
    app.use("/api/products", productRouter);
    app.use("/api/users", userRouter);
    app.use("/api/reviews", reviewsRouter);
    app.use("/api/cart", cartRouter);
};

module.exports = routes;
