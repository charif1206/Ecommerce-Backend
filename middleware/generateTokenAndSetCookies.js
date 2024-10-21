const jwt = require("jsonwebtoken");

module.exports = (res, userId, isAdmin) => {
    const token = jwt.sign({userId, isAdmin}, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });

    const tokenExpiryInMs = 24 * 60 * 60 * 1000;

    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: tokenExpiryInMs,
    });

    return token;
};
