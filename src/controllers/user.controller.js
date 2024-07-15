//Models
const User = require("../models/User.model");
//Responses and errors
const {
  error500,
  error404,
  customError,
} = require("../services/helpers/errors");
const { success } = require("../services/helpers/response");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: {
        $ne: "Admin",
      },
    }).select("profilePic.publicUrl _id userName email phoneNo createdAt status");
    success(res, "200", "Success", users);
  } catch (err) {
    error500(res, err);
  }
};

const changeUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return customError(res, 400, "Status is required");
  }
  try {
    const user = await User.findByIdAndUpdate(id, { status }, { new: true });
    if (!user) {
      return error404(res, "User not found");
    }
    success(res, "200", "User status updated successfully", user);
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  getAllUsers,
  changeUserStatus,
};
