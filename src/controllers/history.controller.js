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
  try {
    const history = await History.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate([
        {
          path: "series",
          select: "thumbnail.publicUrl type views",
          populate: {
            path: "episodes",
            select:
              "episodeVideo.publicUrl title content visibility description",
            options: { sort: { createdAt: 1 }, limit: 1 },
          },
        },
        {
          path: "novel",
          select: "thumbnail.publicUrl type views",
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

    return success(res, "200", "All History record", history);
  } catch (err) {
    return error500(res, err);
  } 
};

module.exports = {
  allHistory,
};
