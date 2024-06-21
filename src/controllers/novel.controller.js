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
//helpers and functions
const cloudinary = require("../services/helpers/cloudinary").v2;

//Add Novel
const addNovel = async (req, res) => {
  try {
    const { title } = req.body;

    // Check if novel already exists
    const existNovel = await Novel.findOne({ title });
    if (existNovel) {
      return error409(res, "Novel Already Exists");
    }

    // Create new novel
    await Novel.create(req.body);

    status200(res, "Novel created successfully");
  } catch (err) {
    error500(res, err);
  }
};

// Get All Novels
const getAllNovels = async (req, res) => {
  try {
    const novels = await Novel.find()
      .populate("category")
      .populate("author")
      .populate("chapters");
    success(res, "200", "Success", novels);
  } catch (err) {
    error500(res, err);
  }
};

const editNovel = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedNovel = await Novel.findOneAndUpdate(
      { _id: id },
      { $set: req.body },
      { new: true }
    );
    if (!updatedNovel) {
      return error404(res, "Novel not found");
    }
    success(res, "200", "Novel updated successfully", updatedNovel);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Novel
const deleteNovel = async (req, res) => {
  const { id } = req.params;

  try {
    const novel = await Novel.findByIdAndDelete(id);
    if (!novel) {
      return error404(res, "Novel not found");
    }

    status200(res, "Novel deleted successfully");
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  addNovel,
  getAllNovels,
  editNovel,
  deleteNovel,
};
