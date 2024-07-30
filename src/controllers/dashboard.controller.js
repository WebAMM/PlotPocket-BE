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
    visibility: "Public",
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
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: {
          sort: { createdAt: 1 },
          limit: 5,
        },
      })
      .sort({ createdAt: -1 })
      .limit(10);
    const novels = await Novel.find(query)
      .select("thumbnail.publicUrl title type")
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content",
        options: {
          sort: { createdAt: 1 },
          limit: 5,
        },
      })
      .sort({ createdAt: -1 })
      .limit(10);

    const topHighlight = [...series, ...novels].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    //Featured novel and series [Based on more views]
    const featuredSeries = await Series.find({
      ...query,
      totalViews: { $gte: 10 },
    })
      .select("thumbnail.publicUrl title type seriesRating")
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: { sort: { createdAt: 1 }, limit: 5 },
      })
      .sort({ totalViews: -1 })
      .limit(10);
    const featuredNovels = await Novel.find({
      ...query,
      totalViews: { $gte: 10 },
    })
      .select("thumbnail.publicUrl title type averageRating")
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content",
        options: { sort: { createdAt: 1 }, limit: 5 },
      })
      .sort({ totalViews: -1 })
      .limit(10);

    const featured = [...featuredSeries, ...featuredNovels].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    //Series + novels history based on logged in user
    let history = await History.find({
      user: req.user._id,
    })
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
      })
      .sort({ createdAt: -1 })
      .limit(10);
    //Latest released novel and series [Based on latest created]
    const latestSeries = await Series.find(query)
      .select("thumbnail.publicUrl title type totalViews")
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
      .sort({ createdAt: -1 })
      .limit(10);
    const latestNovels = await Novel.find(query)
      .select("thumbnail.publicUrl title type totalViews")
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
      })
      .sort({ createdAt: -1 })
      .limit(10);

    const latest = [...latestSeries, ...latestNovels].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    //Top Ranked [Based on ratings and reviews]
    const topRankedSeries = await Series.find({
      ...query,
      ...topRankQuery,
      seriesRating: { $gte: 1 },
    })
      .select("thumbnail.publicUrl title totalViews type seriesRating")
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
      })
      .limit(10);

    const topRankedNovels = await Novel.find({
      ...query,
      ...topRankQuery,
      averageRating: { $gte: 1 },
    })
      .select("thumbnail.publicUrl type title averageRating")
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
      })
      .sort({
        averageRating: -1,
      })
      .limit(10);

    const topRanked = [...topRankedSeries, ...topRankedNovels].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    //All record in response
    const data = {
      topHighlight,
      featured,
      history,
      latest,
      topRanked,
    };
    return success(res, "200", "Success", data);
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
    visibility: "Public",
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
    //TopHighlight series
    const topHighlight = await Series.find(query)
      .select("thumbnail.publicUrl title type")
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: { sort: { createdAt: 1 }, limit: 5 },
      })
      .sort({ createdAt: -1 })
      .limit(10);
    //Best series
    const best = await Series.find({
      ...query,
      totalViews: { $gt: 500 },
    })
      .select("thumbnail.publicUrl title type")
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: { sort: { createdAt: 1 }, limit: 5 },
      })
      .sort({ totalViews: -1 })
      .limit(10);
    //Top series
    const top = await Series.find({
      ...query,
      totalViews: { $gt: 0, $lte: 500 },
    })
      .select("thumbnail.publicUrl title type totalViews")
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
      .sort({ totalViews: -1 })
      .limit(10);
    //Top Ranked [Based on ratings and reviews]
    const topRanked = await Series.find({
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
      })
      .limit(10);
    //All record in response
    const data = {
      topHighlight,
      best,
      top,
      topRanked,
    };
    return success(res, "200", "Success", data);
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
    visibility: "Public",
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
    //TopHighlight novels
    const topHighlight = await Novel.find(query)
      .select("thumbnail.publicUrl title type averageRating")
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews",
        options: {
          sort: { createdAt: 1 },
          limit: 5,
        },
      })
      .sort({ createdAt: -1 })
      .limit(10);
    //Best novels
    const best = await Novel.find({
      ...query,
      totalViews: { $gt: 500 },
    })
      .select("thumbnail.publicUrl title type averageRating")
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews",
        options: { sort: { createdAt: 1 }, limit: 5 },
      })
      .sort({ totalViews: -1 })
      .limit(10);
    //Top novels
    const top = await Novel.find({
      ...query,
      totalViews: { $gt: 0, $lte: 500 },
    })
      .select("thumbnail.publicUrl title type totalViews")
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
      })
      .sort({ totalViews: -1 })
      .limit(10);
    //Top ranked novels
    const topRanked = await Novel.find({
      ...query,
      ...topRankQuery,
      averageRating: { $gte: 1 },
    })
      .select("thumbnail.publicUrl averageRating type title averageRating")
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
      })
      .sort({
        averageRating: -1,
      })
      .limit(10);
    //All record in response
    const data = {
      topHighlight,
      best,
      top,
      topRanked,
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
