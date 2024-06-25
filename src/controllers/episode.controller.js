//Models
const Episode = require("../models/Episode.model");
const Series = require("../models/Series.model");
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
const addEpisode = async (req, res) => {
  const { title } = req.body;
  const { id } = req.params;
  try {
    const seriesExist = await Series.findById(id);

    if (!seriesExist) {
      return error404(res, "Series not found");
    }
    const existEpisode = await Episode.findOne({ title });
    if (existEpisode) {
      return error409(res, "Episode Already Exists");
    }
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video", 
        folder: "episode",
        eager: [{ format: "mp4" }] 
      });
      const newEpisode = await Episode.create({
        ...req.body,
        video: {
          publicUrl: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          duration: result.duration,
          format: "mp4",
        },
      });

      await Series.findByIdAndUpdate(
        id,
        { $push: { episodes: newEpisode._id } },
        { new: true }
      );
      return status200(res, "Episodes added successfully in series");
    } else {
      return error400(res, "Episode video is required");
    }
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  addEpisode,
};
