//Models
const Series = require("../models/Series.model");
const Episode = require("../models/Episode.model");
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
const addSeries = async (req, res) => {
  try {
    const newSeries = new Series(req.body);
    await newSeries.save();
    status200(res, "Series added successfully");
  } catch (err) {
    error500(res, err);
  }
};

// Get All Series
const getAllSeries = async (req, res) => {
  try {
    const chapters = await Series.find().populate("episodes");
    success(res, "200", "Success", chapters);
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  addSeries,
  getAllSeries,
};
