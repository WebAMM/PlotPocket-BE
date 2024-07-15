//Models
const MyList = require("../models/MyList.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

//Add Episode to list
const addEpisodeToList = async (req, res) => {
  const { id } = req.params;
  try {
    const alreadyExist = await MyList.findOne({
      episode: id,
      user: req.user._id,
    });
    if (alreadyExist) {
      return error409(res, "Episode already in list");
    }
    await MyList.create({
      episode: id,
      user: req.user._id,
    });
    return status200(res, "Episode added to list");
  } catch (err) {
    return error500(res, err);
  }
};

//Get All of List
const allMyLists = async (req, res) => {
  try {
    const allMyLists = await MyList.find({
      user: req.user._id,
    }).populate({
      path: "episode",
      select: "title series views",
      populate: {
        path: "series",
        select: "title type",
        populate: {
          path: "category",
          select: "title",
        },
      },
    });
    return success(res, "200", "All List record", allMyLists);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addEpisodeToList,
  allMyLists,
};
