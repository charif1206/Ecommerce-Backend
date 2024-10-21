const express = require("express");
const {getAllUsers, uploadeProfilePicture} = require("../Controllers/usersController");
const upload = require("../middleware/photoUpload");

const userRouter = express.Router();

userRouter.get("/", getAllUsers);

userRouter.post(
    "/:id/profile/upload-profile-picture",
    upload.single("profilePicture"),
    uploadeProfilePicture
);

module.exports = userRouter;
