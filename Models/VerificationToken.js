const mongoose = require("mongoose");
require("dotenv").config();

const verificationTokenSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        token: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const VerificationToken = mongoose.model("VerificationToken", verificationTokenSchema);

module.exports = VerificationToken;
