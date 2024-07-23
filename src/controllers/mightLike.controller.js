//Models
const Novel = require("../models/Novel.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
const mongoose = require("mongoose");

//Get User based like
const mightLike = async (req, res) => {
  try {
    const categories = await Novel.aggregate([
      { $unwind: "$reviews" },
      { $match: { "reviews.user": new mongoose.Types.ObjectId(req.user._id) } },
      { $group: { _id: "$category" } },
    ]);

    const categoryIds = categories.map((category) => category._id);

    const novels = await Novel.find({
      category: { $in: categoryIds },
      "reviews.user": { $ne: new mongoose.Types.ObjectId(req.user._id) },
    })
      .select("thumbnail.publicUrl title description totalViews category")
      .populate("category", "title");

    return success(res, "200", "All might liked novels", novels);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  mightLike,
};
