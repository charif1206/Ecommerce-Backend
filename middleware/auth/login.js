const jwt = require("jsonwebtoken");

const login = (req, res, next) => {
    const token = req.cookies.token;

    // Check if the token is available
    if (!token) {
        return res.status(401).json({error: "Access denied, token missing!"});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();
    } catch (err) {
        console.error(err);
        return res.status(403).json({error: "Invalid token, authorization denied"});
    }
};

module.exports = login;
