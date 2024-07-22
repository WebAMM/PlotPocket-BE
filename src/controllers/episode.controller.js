//Models
const Episode = require("../models/Episode.model");
const Series = require("../models/Series.model");
const History = require("../models/History.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  error400,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
const { default: mongoose } = require("mongoose");
//helpers and functions
const cloudinary = require("../services/helpers/cloudinary").v2;

//Add Episode
const addEpisode = async (req, res) => {
  const { title } = req.body;
  const { id } = req.params;
  try {
    const seriesExist = await Series.findOne({
      _id: id,
      status: "Published",
    });
    if (!seriesExist) {
      return error404(res, "Series not found");
    }
    // const existEpisode = await Episode.findOne({ title });
    // if (existEpisode) {
    //   return error409(res, "Episode Already Exist");
    // }
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "episode",
        eager: [{ format: "mp4" }],
      });
      const newEpisode = await Episode.create({
        ...req.body,
        series: seriesExist._id,
        episodeVideo: {
          publicUrl: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          duration: result.duration,
          format: "mp4",
        },
      });
      await Series.updateOne(
        { _id: id },
        { $push: { episodes: newEpisode._id } },
        { new: true }
      );
      return status200(res, "Episode added in series");
    } else {
      return error400(res, "Episode video is required");
    }
  } catch (err) {
    error500(res, err);
  }
};

//Rate Episode
const rateTheEpisode = async (req, res) => {
  const { id } = req.params;
  let responseMessage = "";
  try {
    const existEpisode = await Episode.findById(id);
    if (!existEpisode) {
      return error409(res, "Episode doesn't exist");
    }
    const userHasRated = existEpisode.ratings.some(
      (rating) => rating.user.toString() === req.user._id.toString()
    );

    if (userHasRated) {
      await Episode.updateOne(
        { _id: id },
        { $pull: { ratings: { user: req.user._id } } }
      );
      await Series.updateOne(
        {
          _id: existEpisode.series,
        },
        {
          $inc: {
            seriesRating: -1,
          },
        }
      );
      responseMessage = "Rating removed from episode";
    } else {
      await Episode.updateOne(
        { _id: id },
        { $push: { ratings: { user: req.user._id, rating: 1 } } }
      );
      await Series.updateOne(
        {
          _id: existEpisode.series,
        },
        {
          $inc: {
            seriesRating: 1,
          },
        }
      );
      responseMessage = "Rated on episode";
    }
    return status200(res, responseMessage);
  } catch (err) {
    return error500(res, err);
  }
};

// All Episode in app to view
const allEpisodeOfSeries = async (req, res) => {
  const { id } = req.params;
  try {
    const seriesExist = await Series.findById(id);
    if (!seriesExist) {
      return error409(res, "Series not found");
    }
    const allEpisodesOfSeries = await Episode.aggregate([
      {
        $match: {
          series: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $addFields: {
          totalRating: {
            $sum: "$ratings.rating",
          },
        },
      },
      {
        $project: {
          "episodeVideo.publicUrl": 1,
          title: 1,
          description: 1,
          content: 1,
          // visibility: 1,
          views: 1,
          totalRating: 1,
          createdAt: 1,
        },
      },
    ]);
    // Increase series views
    await Series.updateOne(
      {
        _id: id,
      },
      {
        $inc: { views: 1 },
      },
      { new: true }
    );
    //Add series in history
    const existHistory = await History.findOne({
      user: req.user._id,
      series: id,
    });
    if (!existHistory) {
      await History.create({
        user: req.user._id,
        series: id,
      });
    }
    success(res, "200", "Success", allEpisodesOfSeries);
  } catch (err) {
    error500(res, err);
  }
};

// All episodes of series in admin panel
const episodesOfSeries = async (req, res) => {
  const { id } = req.params;
  try {
    const seriesExist = await Series.findById(id);
    if (!seriesExist) {
      return error409(res, "Series not found");
    }
    const allEpisodesOfSeries = await Episode.find({
      series: id,
    })
      .select("episodeVideo.publicUrl views createdAt content")
      .populate({
        path: "series",
        select: "thumbnail.publicUrl",
      });
    success(res, "200", "Success", allEpisodesOfSeries);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Episode
const deleteEpisode = async (req, res) => {
  const { id } = req.params;
  try {
    const episode = await Episode.findById(id);
    if (!episode) {
      return error404(res, "Episode not found");
    }
    const series = await Series.findOne({ _id: episode.series });
    if (!series) {
      return error404(res, "Series against episode not found");
    }
    await Series.updateOne(
      {
        _id: episode.series,
      },
      {
        $pull: {
          episodes: id,
        },
      }
    );
    if (episode.episodeVideo && episode.episodeVideo.publicId) {
      await cloudinary.uploader.destroy(episode.episodeVideo.publicId, {
        resource_type: "video",
        folder: "episode",
      });
    }
    await Episode.deleteOne({ _id: id });
    return status200(res, "Episode removed successfully");
  } catch (err) {
    return error500(res, err);
  }
};

// Update Episode
const updateEpisode = async (req, res) => {
  const { id } = req.params;
  try {
    const episode = await Episode.findById(id);
    if (!episode) {
      return error404(res, "Episode not found");
    }
    if (req.file) {
      if (episode.episodeVideo && episode.episodeVideo.publicId) {
        await cloudinary.uploader.destroy(episode.episodeVideo.publicId, {
          resource_type: "video",
          folder: "episode",
        });
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "episode",
        eager: [{ format: "mp4" }],
      });
      await Episode.updateOne(
        {
          _id: id,
        },
        {
          ...req.body,
          thumbnail: {
            publicUrl: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format,
          },
        }
      );
      return status200(res, "Episode updated successfully");
    } else {
      await Episode.updateOne(
        {
          _id: id,
        },
        {
          ...req.body,
        }
      );
      return status200(res, "Episode updated successfully");
    }
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addEpisode,
  rateTheEpisode,
  allEpisodeOfSeries,
  episodesOfSeries,
  deleteEpisode,
  updateEpisode,
};
