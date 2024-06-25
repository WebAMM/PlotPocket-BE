//Models
const Series = require("../models/Series.model");
const Episode = require("../models/Episode.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
  error400,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
//helpers and functions
const cloudinary = require("../services/helpers/cloudinary").v2;

//Add Chapter
const addSeries = async (req, res) => {
  try {
    const { title } = req.body;
    const existSeries = await Series.findOne({ title });
    if (existSeries) {
      return error409(res, "Series already Exists");
    }
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        folder: "series",
      });
      await Series.create({
        ...req.body,
        thumbnail: {
          publicUrl: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
        },
      });
      return status200(res, "Series created successfully");
    } else {
      return error400(res, "Thumbnail is required");
    }
  } catch (err) {
    error500(res, err);
  }
};

// Get All Series
const getAllSeries = async (req, res) => {
  try {
    const chapters = await Series.find()
      .populate("episodes")
      .populate("category");
    success(res, "200", "Success", chapters);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Series
const deleteSeries = async (req, res) => {
  const { id } = req.params;
  try {
    const novel = await Series.findByIdAndDelete(id);
    if (!novel) {
      return error404(res, "Series not found");
    }
    status200(res, "Series deleted successfully");
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  addSeries,
  getAllSeries,
  deleteSeries,
};
