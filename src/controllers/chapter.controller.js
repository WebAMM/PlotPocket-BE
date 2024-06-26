//Models
const Chapter = require("../models/Chapter.model");
const Novel = require("../models/Novel.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  error400,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
//helpers and functions
const cloudinary = require("../services/helpers/cloudinary").v2;

//Add Chapter
const addChapter = async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  try {
    const novelExist = await Novel.findById(id);
    if (!novelExist) {
      return error404(res, "Novel not found");
    }
    const existChapter = await Chapter.findOne({ name });
    if (existChapter) {
      return error409(res, "Chapter Already Exists");
    }
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "raw",
        folder: "chapter",
      });
      const newChapter = await Chapter.create({
        ...req.body,
        chapterPdf: {
          publicUrl: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: "pdf",
        },
      });
      await Novel.findByIdAndUpdate(
        id,
        { $push: { chapters: newChapter._id } },
        { new: true }
      );
      return status200(res, "Chapter added successfully in novel");
    } else {
      return error400(res, "Chapter pdf is required");
    }
  } catch (err) {
    error500(res, err);
  }
};

// Get All Novels
const getAllChaptersByNovel = async (req, res) => {
  try {
    const chapters = await Chapter.find();
    success(res, "200", "Success", chapters);
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  addChapter,
  getAllChaptersByNovel,
};
