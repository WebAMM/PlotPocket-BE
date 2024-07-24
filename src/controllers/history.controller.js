//Models
const History = require("../models/History.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

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
      .select("_id user createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate([
        {
          path: "series",
          select: "thumbnail.publicUrl type totalViews",
          populate: {
            path: "episodes",
            select:
              "episodeVideo.publicUrl title content visibility description",
            options: { sort: { createdAt: 1 }, limit: 5 },
          },
        },
        {
          path: "novel",
          select: "thumbnail.publicUrl type totalViews",
          populate: {
            path: "chapters",
            select: "chapterPdf.publicUrl name chapterNo content totalViews",
            options: {
              sort: {
                createdAt: 1,
              },
              limit: 5,
            },
          },
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
  allHistory,
};
