//Models
const MyList = require("../models/MyList.model");
const Chapter = require("../models/Chapter.model");
const Episode = require("../models/Episode.model");
//Response and errors
const {
  error500,
  error409,
  customError,
  error400,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

//Add Episode to list
const addEpisodeToList = async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;
  if (!type) {
    return error400(res, "Type is required");
  }
  if (type !== "Episode" && type !== "Chapter") {
    return error400(res, "Type must be either Episode or Chapter");
  }

  try {
    if (type === "Episode") {
      const alreadyExist = await MyList.findOne({
        episode: id,
        user: req.user._id,
      });
      if (alreadyExist) {
        await MyLink.deleteOne({
          _id: alreadyExist._id,
        });
        return status200(res, "Episode removed from list");
      }
      const episodeExist = await Episode.findById(id);
      if (!episodeExist) {
        return error409(res, "No such episode exist");
      }
      await MyList.create({
        episode: id,
        user: req.user._id,
      });
    } else {
      const alreadyExist = await MyList.findOne({
        chapter: id,
        user: req.user._id,
      });
      if (alreadyExist) {
        await MyLink.deleteOne({
          _id: alreadyExist._id,
        });
        return status200(res, "Chapter removed from list");
      }

      const chapterExist = await Chapter.findById(id);
      if (!chapterExist) {
        return error409(res, "No such chapter exist");
      }
      await MyList.create({
        chapter: id,
        user: req.user._id,
      });
    }

    return status200(res, `${type} added to list`);
  } catch (err) {
    return error500(res, err);
  }
};

//Get All of List
const allMyLists = async (req, res) => {
  try {
    const allMyLists = await MyList.find({
      user: req.user._id,
    })
      .populate({
        path: "episode",
        select: "title series totalViews",
        populate: {
          path: "series",
          select: "title type",
          populate: {
            path: "category",
            select: "title",
          },
        },
      })
      .populate({
        path: "chapter",
        select: "name chapterNo totalViews novel",
        populate: {
          path: "novel",
          select: "title type",
          populate: {
            path: "category",
            select: "title",
          },
        },
      })
      .select("episode chapter createdAt");

    return success(res, "200", "All list record", allMyLists);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addEpisodeToList,
  allMyLists,
};
