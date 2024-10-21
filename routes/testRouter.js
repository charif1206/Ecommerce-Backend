const express = require("express");
const login = require("../middleware/login");

const testRouter = express.Router();

testRouter.get("/", login, (req, res) => {
    res.send("For testing authorization purposes only");
});

module.exports = testRouter;
