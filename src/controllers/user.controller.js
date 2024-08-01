//Models
const User = require("../models/User.model");
const Episode = require("../models/Episode.model");
const Chapter = require("../models/Chapter.model");
const UserCoin = require("../models/UserCoin.model");
//Responses and errors
const {
  error500,
  error404,
  customError,
  error400,
} = require("../services/helpers/errors");
const { success } = require("../services/helpers/response");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: {
        $ne: "Admin",
      },
    }).select("profilePic.publicUrl _id userName email createdAt status");
    success(res, "200", "Success", users);
  } catch (err) {
    error500(res, err);
  }
};

const getUserCoinsDetail = async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;

  try {
    if (type !== "Episode" && type !== "Chapter") {
      return error400(res, "Type must be Episode or Chapter");
    }

    let price;
    if (type === "Episode") {
      const episodeExist = await Episode.findById(id);
      if (!episodeExist) {
        return error404(res, "Episode not found");
      }
      price = episodeExist.price;
    } else if (type === "Chapter") {
      const existChapter = await Chapter.findById(id);
      if (!existChapter) {
        return error404(res, "Chapter not found");
      }
      price = existChapter.price;
    }

    const coinDetails = await UserCoin.findOne({
      user: req.user._id,
    }).select("bonusCoins refillCoins totalCoins -_id");

    const data = {
      coinBalance: coinDetails,
      price: coinDetails.totalCoins - price,
    };

    return success(res, "200", "Success", data);
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
  getUserCoinsDetail,
};
