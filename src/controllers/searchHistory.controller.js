//Models
const Novel = require("../models/Novel.model");
const SearchHistory = require("../models/SearchHistory.model");
const Series = require("../models/Series.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

// Get All SearchHistory
const getAllSearchHistory = async (req, res) => {
  try {
    const searchHistoryRecords = await SearchHistory.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate([
        {
          path: "series",
          select: "thumbnail.publicUrl type title description",
        },
        {
          path: "novel",
          select: "thumbnail.publicUrl type title description",
        },
      ]);

    const searchHistory = searchHistoryRecords.map((record) => ({
      _id: record._id,
      title: record.series ? record.series.title : record.novel.title,
    }));

    const series = await Series.find({
      status: "Published",
      visibility: "Public",
      seriesRating: { $gte: 1 },
    })
      .select(
        "thumbnail.publicUrl title type seriesRating totalViews createdAt"
      )
      .sort({
        seriesRating: -1,
        createdAt: -1,
      })
      .limit(5)
      .populate({
        path: "episodes",
        select:
          "episodeVideo.publicUrl title content coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .populate({
        path: "category",
        select: "title",
      })
      .lean();

    const novels = await Novel.find({
      status: "Published",
      visibility: "Public",
      averageRating: { $gte: 1 },
    })
      .select("thumbnail.publicUrl averageRating type title averageRating totalViews")
      .sort({
        averageRating: -1,
        createdAt: -1,
      })
      .limit(5)
      .populate({
        path: "category",
        select: "title",
      })
      .populate({
        path: "author",
        select: "name",
      })
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name content coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .lean();

    const mostPopular = [...series, ...novels]
      .map((item) => ({
        ...item,
        episodes:
          item.type === "Series"
            ? item.episodes && item.episodes.length > 0
              ? item.episodes[0]
              : {}
            : undefined,
        chapters:
          item.type === "Novel"
            ? item.chapters && item.chapters.length > 0
              ? item.chapters[0]
              : {}
            : undefined,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const data = {
      searchHistory,
      mostPopular,
    };

    return success(res, "200", "All search history", data);
  } catch (err) {
    return error500(res, err);
  }
};

// Remove search history of user
const removeSearchHistory = async (req, res) => {
  const { id } = req.params;
  try {
    const searchHistory = await SearchHistory.findById(id);
    if (!searchHistory) {
      return error404(res, "Search history not found");
    }
    await SearchHistory.deleteOne({ _id: id });
    return status200(res, "Search history removed successfully");
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  getAllSearchHistory,
  removeSearchHistory,
};
