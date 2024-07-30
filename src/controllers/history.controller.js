//Models
const History = require("../models/History.model");
const Series = require("../models/Series.model");
const Novel = require("../models/Novel.model");
const Chapter = require("../models/Chapter.model");
const Episode = require("../models/Episode.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

const addToHistory = async (req, res) => {
  const { type, seriesId, episodeId, chapterId, novelId } = req.body;

  if (type === "Series") {
    const series = await Series.findById(seriesId);
    if (!series) {
      return error409(res, "Series not found");
    }
    const episode = await Episode.findById(episodeId);
    if (!episode) {
      return error409(res, "Episode not found");
    }
    await History.create({
      user: req.user._id,
      series: seriesId,
      episode: episodeId,
    });
    return status200(res, "Series and episode added to history");
  } else if (type === "Novels") {
    const novel = await Novel.findById(novelId);
    if (!novel) {
      return error409(res, "Novel not found");
    }
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return error409(res, "Chapter not found");
    }
    await History.create({
      user: req.user._id,
      novel: novelId,
      chapter: chapterId,
    });
    return status200(res, "Novel and chapters added to history");
  }
};

//Get All Histories of Logged in user
const allHistory = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  try {
    //For Pagination
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalHistoryCount = await History.countDocuments({
      user: req.user._id,
    });
    const skip = (currentPage - 1) * size;
    const limit = size;

    const userHistory = await History.find({
      user: req.user._id,
    })
      .select("_id createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate([
        {
          path: "series",
          select: "thumbnail.publicUrl type totalViews",
        },
        {
          path: "episode",
          select: "episodeVideo.publicUrl title content visibility description createdAt",
        },
        {
          path: "novel",
          select: "thumbnail.publicUrl type totalViews",
        },
        {
          path: "chapter",
          select: "chapterPdf.publicUrl name chapterNo content totalViews description createdAt",
        },
      ]);

    //To handle infinite scroll on frontend
    const hasMore = skip + limit < totalHistoryCount;

    const data = {
      userHistory,
      hasMore,
    };

    return success(res, "200", "All History record", data);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addToHistory,
  allHistory,
};
