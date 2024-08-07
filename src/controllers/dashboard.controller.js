//Models
const Novel = require("../models/Novel.model");
const Series = require("../models/Series.model");
const User = require("../models/User.model");
const Category = require("../models/Category.model");
const History = require("../models/History.model");
//Responses and errors
const { error500, error409, error400 } = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
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
  if (
    category &&
    category !== "null" &&
    category !== "undefined" &&
    category !== "false"
  ) {
    const existCategory = await Category.findById(category);
    if (!existCategory) {
      return error409(res, "Category not found");
    }
    query.category = category;
  }
  //Filtering based on Day
  if (day && day !== "null" && day !== "undefined" && day !== "false") {
    const parsedDay = parseInt(day);
    if (day === "Today") {
      const today = new Date();
      topRankQuery.createdAt = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else if ([7, 14, 30].includes(parsedDay)) {
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - parsedDay + 1);
      topRankQuery.createdAt = {
        $gte: new Date(startDate.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else {
      return error400(res, "Invalid date parameter. Use 'Today', 7, 14, or 30");
    }
  }
  try {
    //Latest novels and series
    const series = await Series.find(query)
      .select(
        "thumbnail.publicUrl title type totalViews seriesRating createdAt"
      )
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const novels = await Novel.find(query)
      .select(
        "thumbnail.publicUrl title type totalViews averageRating createdAt"
      )
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name content coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const topHighlight = [...series, ...novels]
      .map((item) => ({
        ...item,
        episodes:
          item.type === "Series"
            ? item.episodes && item.episodes.length > 0
              ? item.episodes[0]
              : {}
            : undefined,
        chapters:
          item.type === "Novel"
            ? item.chapters && item.chapters.length > 0
              ? item.chapters[0]
              : {}
            : undefined,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    //Featured novel and series [Based on more views]
    const featuredSeries = await Series.find({
      ...query,
      totalViews: { $gte: 10 },
    })
      .select(
        "thumbnail.publicUrl title type seriesRating totalViews createdAt"
      )
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .sort({ totalViews: -1 })
      .limit(5)
      .lean();
    const featuredNovels = await Novel.find({
      ...query,
      totalViews: { $gte: 10 },
    })
      .select(
        "thumbnail.publicUrl title type totalViews averageRating createdAt"
      )
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name content coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .sort({ totalViews: -1 })
      .limit(5)
      .lean();

    const featured = [...featuredSeries, ...featuredNovels]
      .map((item) => ({
        ...item,
        episodes:
          item.type === "Series"
            ? item.episodes && item.episodes.length > 0
              ? item.episodes[0]
              : {}
            : undefined,
        chapters:
          item.type === "Novel"
            ? item.chapters && item.chapters.length > 0
              ? item.chapters[0]
              : {}
            : undefined,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    //Series + novels history based on logged in user
    let history = await History.find({ user: req.user._id })
      .populate({
        path: "series",
        select: "thumbnail.publicUrl type title seriesRating totalViews",
        populate: [
          {
            path: "category",
            select: "title",
          },
          {
            path: "episodes",
            select: "episodeVideo.publicUrl title content coins",
            options: {
              sort: { createdAt: 1 },
              limit: 1,
            },
          },
        ],
      })
      .populate({
        path: "novel",
        select: "thumbnail.publicUrl title type totalViews averageRating",
        populate: [
          {
            path: "category",
            select: "title",
          },
          {
            path: "chapters",
            select: "chapterPdf.publicUrl name content coins",
            options: {
              sort: { createdAt: 1 },
              limit: 1,
            },
          },
          {
            path: "author",
            select: "name",
          },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    //Category based filtering in the History Series/Novel
    if (
      category &&
      category !== "null" &&
      category !== "undefined" &&
      category !== "false"
    ) {
      history = history.filter((item) => {
        if (item.series) {
          return item.series.category._id.toString() === category;
        } else if (item.novel) {
          return item.novel.category._id.toString() === category;
        }
        return false;
      });
    }

    history = history.map((item) => {
      if (item.series) {
        return {
          _id: item.series._id,
          title: item.series.title,
          type: item.series.type,
          seriesRating: item.series.seriesRating,
          totalViews: item.series.totalViews,
          episodes:
            item.series.episodes && item.series.episodes.length > 0
              ? item.series.episodes[0]
              : {},
          thumbnail: item.series.thumbnail,
          createdAt: item.createdAt,
          category: item.series.category,
        };
      } else if (item.novel) {
        return {
          _id: item.novel._id,
          title: item.novel.title,
          type: item.novel.type,
          averageRating: item.novel.averageRating,
          totalViews: item.novel.totalViews,
          chapters:
            item.novel.chapters && item.novel.chapters.length > 0
              ? item.novel.chapters[0]
              : {},
          thumbnail: item.novel.thumbnail,
          createdAt: item.createdAt,
          category: item.novel.category,
          author: item.novel.author,
        };
      }
      return item;
    });

    //Latest released novel and series [Based on latest created]
    const latestSeries = await Series.find(query)
      .select("thumbnail.publicUrl title type totalViews seriesRating")
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content coins",
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
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const latestNovels = await Novel.find(query)
      .select("thumbnail.publicUrl title type totalViews averageRating")
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name content coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
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
      .limit(5)
      .lean();

    const latest = [...latestSeries, ...latestNovels]
      .map((item) => ({
        ...item,
        episodes:
          item.type === "Series"
            ? item.episodes && item.episodes.length > 0
              ? item.episodes[0]
              : {}
            : undefined,
        chapters:
          item.type === "Novel"
            ? item.chapters && item.chapters.length > 0
              ? item.chapters[0]
              : {}
            : undefined,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    //Top Ranked [Based on ratings and reviews]
    const topRankedSeries = await Series.find({
      ...query,
      ...topRankQuery,
      seriesRating: { $gte: 1 },
    })
      .select("thumbnail.publicUrl title totalViews type seriesRating")
      .populate({
        path: "episodes",
        select:
          "episodeVideo.publicUrl title content visibility description coins",
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
      .sort({
        seriesRating: -1,
      })
      .limit(5)
      .lean();

    const topRankedNovels = await Novel.find({
      ...query,
      ...topRankQuery,
      averageRating: { $gte: 1 },
    })
      .select("thumbnail.publicUrl type title averageRating")
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
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
      .limit(5)
      .lean();

    const topRanked = [...topRankedSeries, ...topRankedNovels]
      .map((item) => ({
        ...item,
        episodes:
          item.type === "Series"
            ? item.episodes && item.episodes.length > 0
              ? item.episodes[0]
              : {}
            : undefined,
        chapters:
          item.type === "Novel"
            ? item.chapters && item.chapters.length > 0
              ? item.chapters[0]
              : {}
            : undefined,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
  if (
    category &&
    category !== "null" &&
    category !== "undefined" &&
    category !== "false"
  ) {
    const existCategory = await Category.findById(category);
    if (!existCategory) {
      return error409(res, "Category not found");
    }
    query.category = category;
  }
  //Filtering based on Day
  if (day && day !== "null" && day !== "undefined" && day !== "false") {
    const parsedDay = parseInt(day);
    if (day === "Today") {
      const today = new Date();
      topRankQuery.createdAt = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else if ([7, 14, 30].includes(parsedDay)) {
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - parsedDay + 1);
      topRankQuery.createdAt = {
        $gte: new Date(startDate.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else {
      return error400(res, "Invalid date parameter. Use 'Today', 7, 14, or 30");
    }
  }
  try {
    //TopHighlight series
    let topHighlight = await Series.find(query)
      .select(
        "thumbnail.publicUrl title type seriesRating totalViews createdAt"
      )
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    topHighlight = topHighlight.map((item) => ({
      ...item,
      episodes:
        item.episodes && item.episodes.length > 0 ? item.episodes[0] : {},
    }));

    //Best series
    let best = await Series.find({
      ...query,
      totalViews: { $gt: 500 },
    })
      .select(
        "thumbnail.publicUrl title type totalViews seriesRating createdAt"
      )
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .populate({
        path: "category",
        select: "title",
      })
      .sort({ totalViews: -1 })
      .limit(10)
      .lean();

    best = best.map((item) => ({
      ...item,
      episodes:
        item.episodes && item.episodes.length > 0 ? item.episodes[0] : {},
    }));

    //Top series
    let top = await Series.find({
      ...query,
      totalViews: { $gt: 0, $lte: 500 },
    })
      .select(
        "thumbnail.publicUrl title type totalViews seriesRating createdAt"
      )
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content coins",
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
      .sort({ totalViews: -1 })
      .limit(10)
      .lean();

    top = top.map((item) => ({
      ...item,
      episodes:
        item.episodes && item.episodes.length > 0 ? item.episodes[0] : {},
    }));

    //Top Ranked [Based on ratings and reviews]
    let topRanked = await Series.find({
      ...query,
      ...topRankQuery,
      seriesRating: { $gte: 1 },
    })
      .select(
        "thumbnail.publicUrl title type totalViews seriesRating createdAt"
      )
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content coins",
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
      .sort({
        seriesRating: -1,
      })
      .limit(10)
      .lean();

    topRanked = topRanked.map((item) => ({
      ...item,
      episodes:
        item.episodes && item.episodes.length > 0 ? item.episodes[0] : {},
    }));

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
  if (
    category &&
    category !== "null" &&
    category !== "undefined" &&
    category !== "false"
  ) {
    const existCategory = await Category.findById(category);
    if (!existCategory) {
      return error409(res, "Category not found");
    }
    query.category = category;
  }
  //Filtering based on Day
  if (day && day !== "null" && day !== "undefined" && day !== "false") {
    const parsedDay = parseInt(day);
    if (day === "Today") {
      const today = new Date();
      topRankQuery.createdAt = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else if ([7, 14, 30].includes(parsedDay)) {
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - parsedDay + 1);
      topRankQuery.createdAt = {
        $gte: new Date(startDate.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else {
      return error400(res, "Invalid date parameter. Use 'Today', 7, 14, or 30");
    }
  }
  try {
    //TopHighlight novels
    let topHighlight = await Novel.find(query)
      .select(
        "thumbnail.publicUrl title type totalViews averageRating createdAt"
      )
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name content totalViews coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    topHighlight = topHighlight.map((item) => ({
      ...item,
      chapters:
        item.chapters && item.chapters.length > 0 ? item.chapters[0] : {},
    }));

    //Best novels
    let best = await Novel.find({
      ...query,
      totalViews: { $gt: 500 },
    })
      .select(
        "thumbnail.publicUrl title type totalViews averageRating createdAt"
      )
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name content totalViews coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .populate({
        path: "author",
        select: "name",
      })
      .populate({
        path: "category",
        select: "title",
      })
      .sort({ totalViews: -1 })
      .limit(10)
      .lean();

    best = best.map((item) => ({
      ...item,
      chapters:
        item.chapters && item.chapters.length > 0 ? item.chapters[0] : {},
    }));

    //Top novels
    let top = await Novel.find({
      ...query,
      totalViews: { $gt: 0, $lte: 500 },
    })
      .select(
        "thumbnail.publicUrl title type totalViews averageRating createdAt"
      )
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name content totalViews coins",
        options: {
          sort: {
            createdAt: 1,
          },
          limit: 1,
        },
      })
      .populate({
        path: "author",
        select: "name",
      })
      .populate({
        path: "category",
        select: "title",
      })
      .sort({ totalViews: -1 })
      .limit(10)
      .lean();

    top = top.map((item) => ({
      ...item,
      chapters:
        item.chapters && item.chapters.length > 0 ? item.chapters[0] : {},
    }));

    //Top ranked novels
    let topRanked = await Novel.find({
      ...query,
      ...topRankQuery,
      averageRating: { $gte: 1 },
    })
      .select(
        "thumbnail.publicUrl averageRating type title totalViews averageRating createdAt"
      )
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name content totalViews coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
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
      .limit(10)
      .lean();

    topRanked = topRanked.map((item) => ({
      ...item,
      chapters:
        item.chapters && item.chapters.length > 0 ? item.chapters[0] : {},
    }));

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
