const {userValidation, User} = require("../Models/user");
const bcrypt = require("bcrypt");
const VerificationToken = require("../Models/VerificationToken");
const crypto = require("crypto");
const sendMail = require("../utils/nodeMailer");
const generateTokenAndSetCookies = require("../middleware/generateTokenAndSetCookies");
const admin = require("../utils/firebaseAdmin");

/**
 * @route   POST /api/users/login
 * @desc    Authenticates a user and sends a verification email if the user's email is not verified
 * @access  Public
 */

module.exports.Login = async (req, res) => {
    const user = await User.findOne({email: req.body.email});
    if (!user) {
        return res.status(400).send("Invalid email");
    }

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
        return res.status(400).send("Invalid password");
    }

    if (!user.isVerified) {
        let verificationToken = await VerificationToken.findOne({user: user._id});
        if (!verificationToken) {
            verificationToken = new VerificationToken({
                userId: user._id,
                token: crypto.randomBytes(32).toString("hex"),
            });
            await verificationToken.save();
        }

        const url = `http://localhost:5173/users/${user._id}/verify/${verificationToken.token}`;
        const subject = "Verify your email";
        const text = `Please click on the following link to verify your email: ${url}`;

        await sendMail(user.email, subject, text);

        res.status(400).json({message: "we sent a verification link to your email"});
    }

    generateTokenAndSetCookies(res, user._id, user.roles);

    const userObject = user.toObject();

    delete userObject.password;

    res.status(200).json(userObject);
};

/**
 * @route   POST /api/users/google-auth
 * @desc    Authenticates a user via Google and creates a new user if they don't exist
 * @access  Public
 */

module.exports.googleAuth = async (req, res) => {
    const {idToken} = req.body;

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const {email, name, picture} = decodedToken;

        // Check if the user already exists
        let user = await User.findOne({email});

        if (!user) {
            // If the user does not exist, create a new user
            user = new User({
                username: name,
                email,
                password: "GoogleAuthUser", // It's better to set it to null instead of a hardcoded password
                profilePicture: {
                    url: picture || "", // Provide a fallback if no picture is available
                    publicId: null,
                },
                isAdmin: false,
                isVerified: true,
            });

            await user.save();
            return res.status(201).json(user);
        }

        // If the user exists, generate a token and set cookies
        generateTokenAndSetCookies(res, user._id, user.isAdmin);

        return res.status(200).json(user);
    } catch (error) {
        // Log the error for debugging
        console.error("Error during Google authentication:", error);

        return res.status(401).json({
            message: "Unauthorized",
            error: error.message || "An error occurred", // Provide more information on the error
        });
    }
};

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new user and sends a verification email
 * @access  Public
 */

module.exports.Register = async (req, res) => {
    const {error} = userValidation.validate(req.body);

    if (error) {
        console.log("Validation error: ", error.details[0].message);
        return res.status(400).send(error.details[0].message);
    }

    let user = await User.findOne({email: req.body.email});
    if (user) {
        console.log("User with that email already exists");
        return res.status(400).send("User with that email already exists");
    }

    user = await User.findOne({username: req.body.username});
    if (user) {
        console.log("User with that username already exists");
        return res.status(400).send("User with that username already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    req.body.password = hashedPassword;

    user = new User(req.body);
    await user.save();

    const verificationToken = new VerificationToken({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
    });
    await verificationToken.save();

    const url = `http://localhost:5173/users/${user._id}/verify/${verificationToken.token}`;
    const subject = "Verify your email";
    const text = `Please click on the following link to verify your email: ${url}`;

    await sendMail(user.email, subject, text);

    res.json({message: "we sent a verification link to your email"});
};

/**
 * @route   GET /api/auth/:id/verify/:token
 * @desc    Verifies the user's email using the token and updates user status
 * @access  Public
 */

module.exports.VerifyLink = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(400).json({message: "invalid userId"});
    }

    const verificationToken = await VerificationToken.findOne({
        userId: user._id,
        token: req.params.token,
    });
    if (!verificationToken) {
        return res.status(400).json({message: "invalid verification token"});
    }

    user.isVerified = true;
    await user.save();

    await verificationToken.deleteOne();

    res.status(200).json({message: "Email verified"});
};

/**
 * @route   POST /api/users/logout
 * @desc    Logs out the user by clearing the authentication token from cookies
 * @access  Private
 */

module.exports.Logout = (req, res) => {
    res.clearCookie("token");
    res.status(200).json({message: "Logged out"});
};
