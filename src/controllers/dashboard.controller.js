//Models
const Novel = require("../models/Novel.model");
const Series = require("../models/Series.model");
const User = require("../models/User.model");
const Category = require("../models/Category.model");
const History = require("../models/History.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
  error400,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
const mongoose = require("mongoose");
const moment = require("moment");

// Admin dashboard insights
const adminDashboardInsights = async (req, res) => {
  const { day } = req.query;

  let startDate;
  let endDate;

  if (day === "7") {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    endDate = new Date();
  } else if (day === "14") {
    startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    endDate = new Date();
  } else if (day === "30") {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date(0);
    endDate = new Date();
  }

  const query =
    day === "30"
      ? { createdAt: { $gt: startDate, $lte: endDate } }
      : { createdAt: { $gte: startDate, $lte: endDate } };

  try {
    const totalNovels = await Novel.countDocuments(query);
    const totalSeries = await Series.countDocuments(query);
    const totalUsers = await User.countDocuments(query);

    const dashboardData = {
      totalNovels,
      totalSeries,
      totalUsers,
    };
    success(res, "200", "Success", dashboardData);
  } catch (err) {
    error500(res, err);
  }
};

// Admin dashboard metrics
const adminDashboardMetrics = async (req, res) => {
  try {
    let query = {};
    if (req.query.year) {
      const year = parseInt(req.query.year);
      if (!moment(year, "YYYY", true).isValid()) {
        return error400(res, "Invalid year provided");
      }

      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
      query = {
        createdAt: { $gte: startDate, $lte: endDate },
      };
    }
    const totalUsers = await User.find(query);
    const dashboardData = {
      totalUsers,
    };
    success(res, "200", "Success", dashboardData);
  } catch (err) {
    error500(res, err);
  }
};

//1st Main screen Series and Novels [APP]
const appDashboard = async (req, res) => {
  const { category, day } = req.query;
  //Query's
  let query = {
    status: "Published",
  };
  let topRankQuery = {};
  //Filtering based on Category
  if (category) {
    const existCategory = await Category.findById(category);
    if (!existCategory) {
      return error409(res, "Category not found");
    }
    query.category = category;
  }
  //Filtering based on Day
  if (day) {
    const parsedDay = parseInt(day);
    if (![7, 14, 30].includes(parsedDay)) {
      return error400(res, "Invalid date parameter");
    }
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - day);
    topRankQuery.createdAt = {
      $gte: startDate,
      $lte: today,
    };
  }
  try {
    //Latest novels and series
    const series = await Series.find(query)
      .select("thumbnail.publicUrl title type")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: {
          sort: { createdAt: 1 },
          limit: 5,
        },
      });
    const novels = await Novel.find(query)
      .select("thumbnail.publicUrl title type")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content",
        options: {
          sort: { createdAt: 1 },
          limit: 5,
        },
      });
    //Featured novel and series [Based on more views]
    const featuredSeries = await Series.find({
      ...query,
      totalViews: { $gte: 10 },
    })
      .select("thumbnail.publicUrl title type seriesRating")
      .sort({ totalViews: -1 })
      .limit(10)
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: { sort: { createdAt: 1 }, limit: 5 },
      });
    const featuredNovels = await Novel.find({
      ...query,
      totalViews: { $gte: 10 },
    })
      .select("thumbnail.publicUrl title type")
      .sort({ totalViews: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews",
        options: { sort: { createdAt: 1 }, limit: 5 },
      });
    //Series + novels history based on logged in user
    let watchedSeriesNovels;
    if (req.user.role === "User") {
      watchedSeriesNovels = await History.find({
        user: req.user._id,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate({
          path: "series",
          select: "thumbnail.publicUrl type totalViews",
          populate: [
            {
              path: "category",
              select: "title",
            },
            {
              path: "episodes",
              select:
                "episodeVideo.publicUrl title content visibility description",
              options: { sort: { createdAt: 1 }, limit: 5 },
            },
          ],
        })
        .populate({
          path: "novel",
          select: "thumbnail.publicUrl title type totalViews",
          populate: [
            {
              path: "category",
              select: "title",
            },
            {
              path: "chapters",
              select: "chapterPdf.publicUrl name chapterNo content totalViews",
              options: { sort: { createdAt: 1 }, limit: 5 },
            },
            {
              path: "author",
              select: "name",
            },
          ],
        });
    }
    //Latest released novel and series [Based on latest created]
    const latestSeries = await Series.find(query)
      .select("thumbnail.publicUrl title type totalViews")
      .sort({ createdAt: -1 })
      .limit(10)
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
    const latestNovels = await Novel.find(query)
      .select("thumbnail.publicUrl title type totalViews")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews",
        options: { sort: { createdAt: 1 }, limit: 5 },
      })
      .populate({
        path: "category",
        select: "title",
      })
      .populate({
        path: "author",
        select: "name",
      });
    //Top Rated [Based on ratings and reviews]
    const topRatedSeries = await Series.find({
      ...query,
      ...topRankQuery,
      seriesRating: { $gte: 1 },
    })
      .select("thumbnail.publicUrl title totalViews type")
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
      .sort({
        seriesRating: -1,
      });
    //Novels based on top rated
    const topRatedNovelsPipeline = [
      {
        $match: {
          ...query,
          ...topRankQuery,
          reviews: { $ne: [] },
        },
      },
      { $unwind: "$reviews" },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          category: { $first: "$category" },
          type: { $first: "$type" },
          author: { $first: "$author" },
          chapters: { $first: "$chapters" },
          thumbnail: { $first: { publicUrl: "$thumbnail.publicUrl" } },
          totalRating: { $avg: "$reviews.rating" },
        },
      },
      { $sort: { totalRating: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
          pipeline: [{ $project: { _id: 1, title: 1 } }],
        },
      },
      {
        $unwind: "$category",
      },
    ];
    const topRatedNovels = await Novel.aggregate(topRatedNovelsPipeline);
    const populatedNovels = await Novel.populate(topRatedNovels, {
      path: "chapters",
      options: { sort: { createdAt: 1 }, limit: 5 },
      select: "chapterPdf.publicUrl name chapterNo content totalViews",
    });
    //All record in response
    const data = {
      series,
      novels,
      featuredSeries,
      featuredNovels,
      watchedSeriesNovels,
      latestNovels,
      latestSeries,
      topRatedSeries,
      topRatedNovels: populatedNovels,
    };
    return success(res, "200", "Success", data);
    //Series based on episodes total ratings
    // const allSeries = await Series.find(query)
    //   .select("thumbnail.publicUrl title view type")
    //   .populate({
    //     path: "episodes",
    //     select: "episodeVideo.publicUrl title content visibility description",
    //     options: {
    //       sort: {
    //         createdAt: 1,
    //       },
    //       limit: 1,
    //     },
    //   })
    //   .populate({
    //     path: "category",
    //     select: "title",
    //   });
    // const seriesRatings = [];
    // for (const series of allSeries) {
    //   let totalSeriesRating = 0;
    //   let hasRatedEpisodes = false;
    //   const episodes = await Episode.find({ series: series._id });
    //   episodes.forEach((episode) => {
    //     if (episode.ratings.length > 0) {
    //       hasRatedEpisodes = true;
    //       const episodeTotalRating = episode.ratings.reduce(
    //         (acc, rating) => acc + rating.rating,
    //         0
    //       );
    //       totalSeriesRating += episodeTotalRating;
    //     }
    //   });
    //   if (hasRatedEpisodes) {
    //     const seriesWithRating = series.toObject();
    //     seriesWithRating.totalRating = totalSeriesRating;
    //     seriesRatings.push(seriesWithRating);
    //   }
    // }
    // seriesRatings.sort((a, b) => b.totalRating - a.totalRating);
    // const topRatedSeries = seriesRatings.slice(0, 5);
  } catch (err) {
    error500(res, err);
  }
};

//Dashboard Series
const dashboardSeries = async (req, res) => {
  const { category, day } = req.query;
  //Query's
  let query = {
    status: "Published",
  };
  let topRankQuery = {};
  //Filtering based on Category
  if (category) {
    const existCategory = await Category.findById(category);
    if (!existCategory) {
      return error409(res, "Category not found");
    }
    query.category = category;
  }
  //Filtering based on Day
  if (day) {
    const parsedDay = parseInt(day);
    if (![7, 14, 30].includes(parsedDay)) {
      return error400(res, "Invalid date parameter");
    }
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - day);
    topRankQuery.createdAt = {
      $gte: startDate,
      $lte: today,
    };
  }
  try {
    //Latest series
    const series = await Series.find(query)
      .select("thumbnail.publicUrl title type")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: { sort: { createdAt: 1 }, limit: 5 },
      });
    //Best series
    const bestSeries = await Series.find({
      ...query,
      totalViews: { $gt: 500 },
    })
      .select("thumbnail.publicUrl title type")
      .sort({ totalViews: -1 })
      .limit(10)
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: { sort: { createdAt: 1 }, limit: 5 },
      });
    //Top series
    const topSeries = await Series.find({
      ...query,
      totalViews: { $gt: 0, $lte: 500 },
    })
      .select("thumbnail.publicUrl title type totalViews")
      .sort({ totalViews: -1 })
      .limit(10)
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
    //Top Rated [Based on ratings and reviews]
    const topRatedSeries = await Series.find(query)
      .select("thumbnail.publicUrl title totalViews type")
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
      .sort({
        seriesRating: -1,
      });
    //All record in response
    const data = {
      series,
      bestSeries,
      topSeries,
      topRatedSeries,
    };
    return success(res, "200", "Success", data);
    //Series based on episodes total ratings OLD
    // const allSeries = await Series.find(query)
    //   .select("thumbnail.publicUrl title view type")
    //   .populate({
    //     path: "episodes",
    //     select: "episodeVideo.publicUrl title content visibility description",
    //     options: {
    //       sort: {
    //         createdAt: 1,
    //       },
    //       limit: 1,
    //     },
    //   })
    //   .populate({
    //     path: "category",
    //     select: "title",
    //   });
    // const seriesRatings = [];
    // for (const series of allSeries) {
    //   let totalSeriesRating = 0;
    //   let hasRatedEpisodes = false;
    //   const episodes = await Episode.find({ series: series._id });
    //   episodes.forEach((episode) => {
    //     if (episode.ratings.length > 0) {
    //       hasRatedEpisodes = true;
    //       const episodeTotalRating = episode.ratings.reduce(
    //         (acc, rating) => acc + rating.rating,
    //         0
    //       );
    //       totalSeriesRating += episodeTotalRating;
    //     }
    //   });
    //   if (hasRatedEpisodes) {
    //     const seriesWithRating = series.toObject();
    //     seriesWithRating.totalRating = totalSeriesRating;
    //     seriesRatings.push(seriesWithRating);
    //   }
    // }
    // seriesRatings.sort((a, b) => b.totalRating - a.totalRating);
    // const topRatedSeries = seriesRatings.slice(0, 10);
  } catch (err) {
    error500(res, err);
  }
};

// Dashboard Novels.
const dashboardNovels = async (req, res) => {
  const { category, day } = req.query;
  //Query's
  let query = {
    status: "Published",
  };
  let topRankQuery = {};
  //Filtering based on Category
  if (category) {
    const existCategory = await Category.findById(category);
    if (!existCategory) {
      return error409(res, "Category not found");
    }
    query.category = category;
  }
  //Filtering based on Day
  if (day) {
    const parsedDay = parseInt(day);
    if (![7, 14, 30].includes(parsedDay)) {
      return error400(res, "Invalid date parameter");
    }
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - day);
    topRankQuery.createdAt = {
      $gte: startDate,
      $lte: today,
    };
  }
  try {
    //Latest novels
    const novels = await Novel.find(query)
      .select("thumbnail.publicUrl title type")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews",
        options: {
          sort: { createdAt: 1 },
          limit: 5,
        },
      });
    //Best novels
    const bestNovels = await Novel.find({
      ...query,
      totalViews: { $gt: 500 },
    })
      .select("thumbnail.publicUrl title type")
      .sort({ totalViews: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews",
        options: { sort: { createdAt: 1 }, limit: 5 },
      });
    //Top novels
    const topNovels = await Novel.find({
      ...query,
      totalViews: { $gt: 0, $lte: 500 },
    })
      .select("thumbnail.publicUrl title type totalViews")
      .sort({ totalViews: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews",
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
    //Top ranked novels
    const topRatedNovelsPipeline = [
      { $unwind: "$reviews" },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          category: { $first: "$category" },
          type: { $first: "$type" },
          author: { $first: "$author" },
          chapters: { $first: "$chapters" },
          thumbnail: { $first: { publicUrl: "$thumbnail.publicUrl" } },
          totalRating: { $avg: "$reviews.rating" },
        },
      },
      { $sort: { totalRating: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
          pipeline: [{ $project: { _id: 1, title: 1 } }],
        },
      },
      {
        $unwind: "$category",
      },
    ];

    if (category) {
      topRatedNovelsPipeline.unshift({
        $match: { category: new mongoose.Types.ObjectId(category) },
      });
    }
    const topRatedNovels = await Novel.aggregate(topRatedNovelsPipeline);
    const populatedNovels = await Novel.populate(topRatedNovels, {
      path: "chapters",
      options: { sort: { createdAt: 1 }, limit: 5 },
      select: "chapterPdf.publicUrl name chapterNo content totalViews",
    });
    //All record in response
    const data = {
      novels,
      bestNovels,
      topNovels,
      topRatedNovels: populatedNovels,
    };
    success(res, "200", "Success", data);
  } catch (err) {
    error500(res, err);
  }
};






module.exports = {
  adminDashboardInsights,
  adminDashboardMetrics,
  appDashboard,
  dashboardSeries,
  dashboardNovels,
};
