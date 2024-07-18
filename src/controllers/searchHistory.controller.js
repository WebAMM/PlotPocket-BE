//Models
const SearchHistorySchema = require("../models/SearchHistory.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

// Get All Categories
const getAllSearchHistory = async (req, res) => {
  try {
    const searchHistory = await SearchHistorySchema.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate([
        {
          path: "series",
          select: "thumbnail.publicUrl type views title description",
          populate: {
            path: "episodes",
            select:
              "episodeVideo.publicUrl title content visibility description",
            options: { sort: { createdAt: 1 }, limit: 1 },
          },
        },
        {
          path: "novel",
          select: "thumbnail.publicUrl type views title description",
          populate: {
            path: "chapters",
            select: "chapterPdf.publicUrl name chapterNo content views",
            options: {
              sort: {
                createdAt: 1,
              },
              limit: 1,
            },
          },
        },
      ]);

    return success(res, "200", "All search history", searchHistory);
  } catch (err) {
    return error500(res, err);
  }
};

// Remove search history of user
const removeSearchHistory = async (req, res) => {
  const { id } = req.params;
  try {
    const searchHistory = await SearchHistorySchema.findById(id);
    if (!searchHistory) {
      return error404(res, "Search history not found");
    }
    await SearchHistorySchema.deleteOne({ _id: id });
    return status200(res, "Search history removed successfully");
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  getAllSearchHistory,
  removeSearchHistory,
};
