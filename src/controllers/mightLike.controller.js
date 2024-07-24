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
  const { page = 1, pageSize = 10 } = req.query;
  try {
    const categories = await Novel.aggregate([
      { $unwind: "$reviews" },
      { $match: { "reviews.user": new mongoose.Types.ObjectId(req.user._id) } },
      { $group: { _id: "$category" } },
    ]);

    const categoryIds = categories.map((category) => category._id);

    // Pagination calculations
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalNovelsCount = await Novel.countDocuments({
      category: { $in: categoryIds },
      "reviews.user": { $ne: new mongoose.Types.ObjectId(req.user._id) },
    });
    const skip = (currentPage - 1) * size;
    const limit = size;

    const mightLikedNovels = await Novel.find({
      category: { $in: categoryIds },
      "reviews.user": { $ne: new mongoose.Types.ObjectId(req.user._id) },
    })
      .select("thumbnail.publicUrl title description totalViews category")
      .populate("category", "title")
      .skip(skip)
      .limit(limit);

    // To handle infinite scroll on frontend
    const hasMore = skip + limit < totalNovelsCount;

    const data = {
      mightLikedNovels,
      hasMore,
    };

    return success(res, "200", "All might liked novels", data);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  mightLike,
};
