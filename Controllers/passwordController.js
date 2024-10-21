const {User, passwordResetEmailValidation, passwordResetValidation} = require("../Models/user");
const VerificationToken = require("../Models/VerificationToken");
const crypto = require("crypto");
const sendMail = require("../utils/nodeMailer");
const bcrypt = require("bcrypt");

module.exports.restPasswordLink = async (req, res) => {
    const {error} = passwordResetEmailValidation.validate(req.body);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }

    const user = await User.findOne({email: req.body.email});
    if (!user) {
        return res.status(400).send("Invalid email");
    }

    const verificationToken = new VerificationToken({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
    });

    await verificationToken.save();

    const link = `http://localhost:5173/users/${user._id}/password-reset/${verificationToken.token}`;
    const subject = "Reset your password";
    const text = `Please click on the following link to reset your password: ${link}`;
    await sendMail(user.email, subject, text);

    res.status(200).json({message: "we sent a reset link to your email"});
};

module.exports.verifyRestPasswordLink = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(400).send("Invalid user id");
    }

    const verificationToken = await VerificationToken.findOne({
        userId: user._id,
        token: req.params.token,
    });
    if (!verificationToken) return res.status(400).send("Invalid verification token");
};

module.exports.restPassword = async (req, res) => {
    const {error} = passwordResetValidation.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findById(req.params.id);
    if (!user) return res.status(400).send("Invalid user id");

    const verificationToken = await VerificationToken.findOne({
        userId: user._id,
        token: req.params.token,
    });
    if (!verificationToken) return res.status(400).send("Invalid verification token");

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(req.body.password, salt);

    user.password = hashedPassword;

    await user.save();

    await verificationToken.deleteOne();
};
