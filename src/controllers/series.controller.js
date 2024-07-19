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
const Category = require("../models/Category.model");
//helpers and functions
const cloudinary = require("../services/helpers/cloudinary").v2;

//Add Series
const addSeries = async (req, res) => {
  try {
    const { title, category, draftId } = req.body;
    if (draftId) {
      const draftedSeries = await Series.findById({
        _id: draftId,
        status: "Draft",
      });

      if (!draftedSeries) {
        return error409(res, "No such draft exists");
      }
      const existCategory = await Category.findById(category);

      if (!existCategory) {
        return error409(res, "Category don't exists");
      }
      if (existCategory.type !== "Series") {
        return error400(res, "Category type don't belong to series");
      }
      if (draftedSeries.thumbnail.publicUrl) {
        await Series.updateOne(
          {
            _id: draftId,
          },
          {
            ...req.body,
            status: "Published",
          }
        );
        return status200(res, "Series published successfully");
      } else if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: "image",
          folder: "series",
        });
        await Series.updateOne(
          {
            _id: draftId,
          },
          {
            ...req.body,
            thumbnail: {
              publicUrl: result.url,
              secureUrl: result.secure_url,
              publicId: result.public_id,
              format: result.format,
            },
            status: "Published",
          }
        );
        return status200(res, "Series published successfully");
      } else {
        return error400(res, "Thumbnail is required");
      }
    } else {
      const existSeries = await Series.findOne({ title, status: "Published" });
      if (existSeries) {
        return error409(res, "Series already exists");
      }
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category don't exists");
      }
      if (existCategory.type !== "Series") {
        return error400(res, "Category type don't belong to series");
      }
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: "image",
          folder: "series",
        });
        await Series.create({
          ...req.body,
          status: "Published",
          thumbnail: {
            publicUrl: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format,
          },
        });
        return status200(res, "Series published successfully");
      } else {
        return error400(res, "Thumbnail is required");
      }
    }
  } catch (err) {
    error500(res, err);
  }
};

//Draft Series
const addSeriesToDraft = async (req, res) => {
  try {
    const { title, category } = req.body;
    if (title) {
      const existSeries = await Series.findOne({ title });
      if (existSeries) {
        return error409(res, "Series already exists");
      }
    }

    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category don't exists");
      }
      if (existCategory.type !== "Series") {
        return error400(res, "Category type don't belong to series");
      }
    }

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        folder: "series",
      });
      await Series.create({
        ...req.body,
        status: "Draft",
        thumbnail: {
          publicUrl: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
        },
      });
    } else {
      await Series.create({
        status: "Draft",
        ...req.body,
      });
    }
    return status200(res, "Series drafted successfully");
  } catch (err) {
    error500(res, err);
  }
};

//Edit Series
const editSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    const seriesExist = await Series.findById(id);
    if (!seriesExist) {
      return error409(res, "Series not found");
    }
    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category don't exists");
      }
      if (existCategory.type !== "Series") {
        return error400(res, "Category type don't belong to series");
      }
    }
    if (req.file) {
      if (seriesExist.thumbnail && seriesExist.thumbnail.publicId) {
        await cloudinary.uploader.destroy(seriesExist.thumbnail.publicId);
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        folder: "series",
      });
      const updatedSeries = await Series.findByIdAndUpdate(
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
        },
        {
          new: true,
        }
      );
      return success(res, "200", "Success", updatedSeries);
    } else {
      const updatedSeries = await Series.findByIdAndUpdate(
        {
          _id: id,
        },
        {
          ...req.body,
        },
        {
          new: true,
        }
      );
      return success(res, "200", "Success", updatedSeries);
    }
  } catch (err) {
    error500(res, err);
  }
};

// Get All Series
const getAllSeries = async (req, res) => {
  try {
    const series = await Series.find()
      .select("_id title description visibility createdAt thumbnail.publicUrl")
      .populate({
        path: "category",
        select: "_id title",
      })
      .populate("episodes");

    if (series.length === 0) {
      return success(res, "200", "Success", series);
    }
    const allSeries = series.map((series) => ({
      _id: series._id,
      thumbnail: series.thumbnail,
      title: series.title,
      description: series.description,
      publishDate: series.createdAt,
      views: series.views,
      visibility: series.visibility,
      language: series.language,
      category: series.category,
      author: series.author,
      reviews: series.reviews,
      totalEpisode: series.episodes.length,
    }));

    return success(res, "200", "Success", allSeries);
  } catch (err) {
    return error500(res, err);
  }
};

// Delete Series
const deleteSeries = async (req, res) => {
  const { id } = req.params;
  try {
    const series = await Series.findById(id);
    if (!series) {
      return error404(res, "Series not found");
    }

    const seriesEpisode = await Episode.find({ series: id });
    if (seriesEpisode.length) {
      for (const episode of seriesEpisode) {
        if (episode.episodeVideo && episode.episodeVideo.publicId) {
          await cloudinary.uploader.destroy(episode.episodeVideo.publicId);
        }
        await Episode.deleteOne(episode._id);
      }
    }
    if (series.thumbnail && series.thumbnail.publicId) {
      await cloudinary.uploader.destroy(series.thumbnail.publicId);
    }
    await Series.deleteOne({ _id: id });
    return status200(res, "Series deleted successfully with all episodes");
  } catch (err) {
    error500(res, err);
  }
};

// Top rated series
const getTopRatedSeries = async (req, res) => {
  const { categoryId } = req.query;
  const { latest } = req.body;

  const query = {};

  if (categoryId) {
    query.category = categoryId;
  }

  const sortOptions = {
    seriesRating: -1,
  };

  if (latest) {
    sortOptions.createdAt = -1;
  }

  try {
    const topRatedSeries = await Series.find(query)
      .select("thumbnail.publicUrl title view type")
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: {
          sort: {
            createdAt: 1,
          },
          limit: 1,
        },
      })
      .populate({
        path: "category",
        select: "title",
      })
      .sort(sortOptions);

    return success(res, "200", "Success", topRatedSeries);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addSeries,
  addSeriesToDraft,
  getAllSeries,
  deleteSeries,
  getTopRatedSeries,
  editSeries,
};
