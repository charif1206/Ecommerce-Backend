const express = require("express");
const {getAllUsers, uploadeProfilePicture} = require("../Controllers/usersController");
const {upload} = require("../middleware/photoUpload");
const checkRole = require("../middleware/auth/mainRoleCheker");
const userRouter = express.Router();
const login = require("../middleware/auth/login");

userRouter.get("/", [login, checkRole("admin")], getAllUsers);

userRouter.post(
    "/:id/profile/upload-profile-picture",
    [login, checkRole("customer"), upload.single("profilePicture")],
    uploadeProfilePicture
);

// userRouter.delete("/:id", [login, checkRole("admin")], deleteUser);

module.exports = userRouter;
