//Models
const Series = require("../models/Series.model");
const Episode = require("../models/Episode.model");
const Category = require("../models/Category.model");
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
const mongoose = require("mongoose");

//Publish the series
const addSeries = async (req, res) => {
  try {
    const { title, category, draftId } = req.body;
    if (draftId) {
      const draftSeries = await Series.findOne({
        _id: draftId,
        status: "Draft",
      });

      if (!draftSeries) {
        return error409(res, "Series not found in draft");
      }

      const alreadyPublished = await Series.findOne({
        _id: draftId,
        status: "Published",
      });

      if (alreadyPublished) {
        return error400(res, "Series already published");
      }

      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category don't exist");
      }
      if (existCategory.type !== "Series") {
        return error400(res, "Category type don't belong to series");
      }
      if (draftSeries.thumbnail.publicUrl) {
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
        return error409(res, "Series already exist");
      }
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category don't exist");
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
        return error409(res, "Series already exist");
      }
    }

    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category don't exist");
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
        thumbnail: {
          publicUrl: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
        },
        status: "Draft",
      });
    } else {
      await Series.create({
        ...req.body,
        thumbnail: {
          publicUrl: "",
          secureUrl: "",
          publicId: "",
          format: "",
        },
        status: "Draft",
      });
    }
    return status200(res, "Series saved as draft");
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
        return error409(res, "Category don't exist");
      }
      if (existCategory.type !== "Series") {
        return error400(res, "Category type don't belong to series");
      }
    }
    if (req.file) {
      if (seriesExist.thumbnail && seriesExist.thumbnail.publicId) {
        await cloudinary.uploader.destroy(seriesExist.thumbnail.publicId, {
          resource_type: "image",
          folder: "series",
        });
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
      .select(
        "_id title description visibility createdAt thumbnail.publicUrl status totalViews"
      )
      .populate({
        path: "category",
        select: "title",
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
      totalViews: series.totalViews,
      visibility: series.visibility,
      language: series.language,
      category: series.category,
      author: series.author,
      status: series.status,
      totalEpisode: series.episodes.length || 0,
    }));

    return success(res, "200", "Success", allSeries);
  } catch (err) {
    return error500(res, err);
  }
};

// Get All Episode Of Series
const getAllEpisodeOfSeries = async (req, res) => {
  const { id } = req.params;
  const { page = 1, pageSize = 10 } = req.query;
  try {
    const seriesExist = await Series.findById(id);
    if (!seriesExist) {
      return error409(res, "Series not found");
    }

    // Pagination calculations
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalEpisodeCount = await Episode.countDocuments({ series: id });
    const skip = (currentPage - 1) * size;
    const limit = size;

    const episodes = await Episode.find({
      series: id,
    })
      .select(
        "episodeVideo.publicUrl totalViews createdAt content title description "
      )
      .populate({
        path: "series",
        select: "thumbnail.publicUrl",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    //To handle infinite scroll on frontend
    const hasMore = skip + limit < totalEpisodeCount;

    const data = {
      episodes,
      hasMore,
    };

    return success(res, "200", "Success", data);
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
          await cloudinary.uploader.destroy(episode.episodeVideo.publicId, {
            resource_type: "image",
            folder: "series",
          });
        }
        await Episode.deleteOne(episode._id);
      }
    }
    if (series.thumbnail && series.thumbnail.publicId) {
      await cloudinary.uploader.destroy(series.thumbnail.publicId, {
        resource_type: "image",
        folder: "series",
      });
    }
    await Series.deleteOne({ _id: id });
    return status200(res, "Series deleted successfully with all episodes");
  } catch (err) {
    error500(res, err);
  }
};

//All views of series
const allViewsOfSeries = async (req, res) => {
  const { date } = req.query;
  const { id } = req.params;
  let startDate;
  const currentDate = new Date();
  try {
    if (date) {
      switch (date) {
        case "lastMonth":
          startDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
          );
          endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            0
          );
          break;
        case "lastSixMonth":
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 6);
          endDate = new Date();
          break;
        case "lastYear":
          const currentYear = new Date().getFullYear();
          const lastYear = currentYear - 1;
          startDate = new Date(`${lastYear}-01-01T00:00:00.000Z`);
          endDate = new Date(`${lastYear}-12-31T23:59:59.999Z`);
          break;
        default:
          return error404(res, "Invalid date filter");
      }
    }

    const query = startDate
      ? { $gte: startDate, $lte: endDate }
      : { $lte: new Date() };

    const series = await Series.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $unwind: "$views",
      },
      {
        $match: {
          "views.date": query,
        },
      },
      {
        $project: {
          _id: 0,
          "views.user": 1,
          "views.date": 1,
          "views.view": 1,
          "views._id": 1,
        },
      },
    ]);

    const seriesViews = series.map((elem) => elem.views);
    return success(res, "200", "Success", seriesViews);
  } catch (err) {
    return error500(res, err);
  }
};

// Best rated series
const bestSeries = async (req, res) => {
  const { category, page = 1, pageSize = 10 } = req.query;

  let query = {
    status: "Published",
    visibility: "Public",
    totalViews: { $gt: 500 },
  };

  try {
    //Filtering based on Category
    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category not found");
      }
      query.category = category;
    }

    // Pagination calculations
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalSeriesCount = await Series.countDocuments(query);
    const skip = (currentPage - 1) * size;
    const limit = size;

    const bestSeries = await Series.find(query)
      .select("thumbnail.publicUrl title view type totalViews")
      .sort({ totalViews: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: {
          sort: {
            createdAt: 1,
          },
          limit: 5,
        },
      })
      .populate({
        path: "category",
        select: "title",
      });

    //To handle infinite scroll on frontend
    const hasMore = skip + limit < totalSeriesCount;

    const data = {
      bestSeries,
      hasMore,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

// Top rated series
const topSeries = async (req, res) => {
  const { category, page = 1, pageSize = 10 } = req.query;

  let query = {
    status: "Published",
    visibility: "Public",
    totalViews: { $gt: 0, $lte: 500 },
  };

  try {
    //Filtering based on Category
    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category not found");
      }
      query.category = category;
    }

    // Pagination calculations
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalSeriesCount = await Series.countDocuments(query);
    const skip = (currentPage - 1) * size;
    const limit = size;

    const topSeries = await Series.find(query)
      .select("thumbnail.publicUrl title type totalViews")
      .sort({ totalViews: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: {
          sort: {
            createdAt: 1,
          },
          limit: 5,
        },
      })
      .populate({
        path: "category",
        select: "title",
      });

    //To handle infinite scroll on frontend
    const hasMore = skip + limit < totalSeriesCount;

    const data = {
      topSeries,
      hasMore,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

// Top rated series
const getTopRatedSeries = async (req, res) => {
  const { category, latest, day, page = 1, pageSize = 10 } = req.query;
  //Query's
  let query = {
    status: "Published",
    visibility: "Public",
    seriesRating: { $gte: 1 },
  };

  //Filtering based on classifications
  let sortOptions = {
    seriesRating: -1,
  };

  if (latest) {
    sortOptions.createdAt = -1;
  }

  try {
    //Filtering based on Category
    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category not found");
      }
      query.category = category;
    }

    // Pagination calculations
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalSeriesCount = await Series.countDocuments(query);
    const skip = (currentPage - 1) * size;
    const limit = size;

    //Filtering based on Day
    if (day) {
      const parsedDay = parseInt(day);
      if (![7, 14, 30].includes(parsedDay)) {
        return error400(res, "Invalid date parameter");
      }
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - day);
      query.createdAt = {
        $gte: startDate,
        $lte: today,
      };
    }

    const topRatedSeries = await Series.find(query)
      .select("thumbnail.publicUrl title view type seriesRating")
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: {
          sort: {
            createdAt: 1,
          },
          limit: 5,
        },
      })
      .populate({
        path: "category",
        select: "title",
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    //To handle infinite scroll on frontend
    const hasMore = skip + limit < totalSeriesCount;

    const data = {
      topRatedSeries,
      hasMore,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

//All series by type
const getDetailSeriesByType = async (req, res) => {
  const { type, category, day, page = 1, pageSize = 10 } = req.query;
  const validTypes = ["Best", "Top", "TopRanked"];
  if (!validTypes.includes(type)) {
    return error400(
      res,
      "Invalid type parameter. Choose either Best, Top or TopRanked"
    );
  }
  try {
    if (type === "Best") {
      let query = {
        status: "Published",
        visibility: "Public",
        totalViews: { $gt: 500 },
      };

      //Filtering based on Category
      if (category) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error409(res, "Category not found");
        }
        query.category = category;
      }

      // Pagination calculations
      const currentPage = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const totalSeriesCount = await Series.countDocuments(query);
      const skip = (currentPage - 1) * size;
      const limit = size;

      const bestSeries = await Series.find(query)
        .select("thumbnail.publicUrl title view type totalViews")
        .sort({ totalViews: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "episodes",
          select: "episodeVideo.publicUrl title content visibility description",
          options: {
            sort: {
              createdAt: 1,
            },
            limit: 5,
          },
        })
        .populate({
          path: "category",
          select: "title",
        });

      //To handle infinite scroll on frontend
      const hasMore = skip + limit < totalSeriesCount;

      const data = {
        series: bestSeries,
        hasMore,
      };

      return success(res, "200", "Success", data);
    } else if (type === "Top") {
      let query = {
        status: "Published",
        visibility: "Public",
        totalViews: { $gt: 0, $lte: 500 },
      };

      //Filtering based on Category
      if (category) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error409(res, "Category not found");
        }
        query.category = category;
      }

      // Pagination calculations
      const currentPage = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const totalSeriesCount = await Series.countDocuments(query);
      const skip = (currentPage - 1) * size;
      const limit = size;

      const topSeries = await Series.find(query)
        .select("thumbnail.publicUrl title type totalViews")
        .sort({ totalViews: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "episodes",
          select: "episodeVideo.publicUrl title content visibility description",
          options: {
            sort: {
              createdAt: 1,
            },
            limit: 5,
          },
        })
        .populate({
          path: "category",
          select: "title",
        });

      //To handle infinite scroll on frontend
      const hasMore = skip + limit < totalSeriesCount;

      const data = {
        series: topSeries,
        hasMore,
      };

      return success(res, "200", "Success", data);
    } else if (type === "TopRanked") {
      let query = {
        status: "Published",
        visibility: "Public",
        seriesRating: { $gte: 1 },
      };

      //Filtering based on classifications
      let sortOptions = {
        seriesRating: -1,
      };

      if (category) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error409(res, "Category not found");
        }
        query.category = category;
      }

      // Pagination calculations
      const currentPage = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const totalSeriesCount = await Series.countDocuments(query);
      const skip = (currentPage - 1) * size;
      const limit = size;

      //Filtering based on Day
      if (day) {
        const parsedDay = parseInt(day);
        if (day === "Today") {
          const today = new Date();
          query.createdAt = {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lte: new Date(today.setHours(23, 59, 59, 999)),
          };
        } else if ([7, 14, 30].includes(parsedDay)) {
          const today = new Date();
          const startDate = new Date();
          startDate.setDate(today.getDate() - parsedDay + 1);
          query.createdAt = {
            $gte: new Date(startDate.setHours(0, 0, 0, 0)),
            $lte: new Date(today.setHours(23, 59, 59, 999)),
          };
        } else {
          return error400(
            res,
            "Invalid date parameter. Use 'Today', 7, 14, or 30"
          );
        }
      }

      const topRatedSeries = await Series.find(query)
        .select("thumbnail.publicUrl title view type seriesRating")
        .populate({
          path: "episodes",
          select: "episodeVideo.publicUrl title content visibility description",
          options: {
            sort: {
              createdAt: 1,
            },
            limit: 5,
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

      //To handle infinite scroll on frontend
      const hasMore = skip + limit < totalSeriesCount;

      const data = {
        series: topRatedSeries,
        hasMore,
      };

      return success(res, "200", "Success", data);
    }
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addSeries,
  addSeriesToDraft,
  getAllSeries,
  deleteSeries,
  editSeries,
  allViewsOfSeries,
  bestSeries,
  topSeries,
  getTopRatedSeries,
  getAllEpisodeOfSeries,
  getDetailSeriesByType,
};
