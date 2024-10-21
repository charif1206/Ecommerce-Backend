const authRouter = require("../routes/authRouter");
const PasswordRouter = require("../routes/passwordRouter");
const testRouter = require("../routes/testRouter");
const userRouter = require("../routes/userRouter");

const routes = (app) => {
    app.use("/api/auth", authRouter);
    app.use("/api/password", PasswordRouter);
    app.use("/api/test", testRouter);
    app.use("/api/users", userRouter)
};

module.exports = routes;
