//Models
const Chapter = require("../models/Chapter.model");
const Novel = require("../models/Novel.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
//helpers and functions
const cloudinary = require("../services/helpers/cloudinary").v2;

//Add Chapter
const addChapter = async (req, res) => {
  const { name, chapterNo, content } = req.body;
  const { id } = req.params;

  if (!name || !chapterNo || !content) {
    return customError(res, 400, "Invalid input data");
  }
  try {
    const novelExist = await Novel.findById(id);
    if (!novelExist) {
      return error404(res, "Novel not found");
    }
    const existChapter = await Chapter.findOne({ name });
    if (existChapter) {
      return error409(res, "Chapter Already Exists");
    }
    const newChapter = new Chapter(req.body);
    await newChapter.save();
    await Novel.findByIdAndUpdate(
      id,
      { $push: { chapters: newChapter._id } },
      { new: true }
    );
    status200(res, "Chapter added successfully in novel");
  } catch (err) {
    error500(res, err);
  }
};

// Get All Novels
const getAllChaptersByNovel = async (req, res) => {
  try {
    const chapters = await Chapter.find({});
    success(res, "200", "Success", chapters);
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  addChapter,
  getAllChaptersByNovel,
};
