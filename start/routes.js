const authRouter = require("../routes/authRouter");
const PasswordRouter = require("../routes/passwordRouter");
const productRouter = require("../routes/productRoute");
const userRouter = require("../routes/userRouter");

const routes = (app) => {
    app.use("/api/auth", authRouter);
    app.use("/api/password", PasswordRouter);
    app.use("/api/products", productRouter);
    app.use("/api/users", userRouter);
};

module.exports = routes;
