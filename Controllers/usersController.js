const { User } = require("../Models/user");

module.exports.getAllUsers = async (req, res) => {
  const users = await User.find();
  res.send(users);
}

module.exports.getUser = async (req, res) => {
  const user = User.findById()
  if (!user) {
    return res.status(404).send("User not found");
  }

  res.send(user);
}