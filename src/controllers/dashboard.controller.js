//Models
const Novel = require("../models/Novel.model");
const Series = require("../models/Series.model");
const User = require("../models/User.model");
const Episode = require("../models/Episode.model");
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

// Admin dashboard
const adminDashboard = async (req, res) => {
  try {
    const totalNovels = await Novel.countDocuments();
    const totalSeries = await Series.countDocuments();
    const totalUsers = await User.countDocuments();
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

//1st Main screen [APP]
const appDashboard = async (req, res) => {
  const { categoryId } = req.query;
  const query = {};

  if (categoryId) {
    query.category = categoryId;
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
          limit: 1,
        },
      });
    const novels = await Novel.find(query)
      .select("thumbnail.publicUrl title type")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content views",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      });
    //Featured novel and series [Based on more views]
    const featuredSeries = await Series.find({ ...query, views: { $gte: 1 } })
      .select("thumbnail.publicUrl title type")
      .sort({ views: -1 })
      .limit(10)
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: { sort: { createdAt: 1 }, limit: 1 },
      });
    const featuredNovels = await Novel.find({ ...query, views: { $gte: 1 } })
      .select("thumbnail.publicUrl title type")
      .sort({ views: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content views",
        options: { sort: { createdAt: 1 }, limit: 1 },
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
          select: "thumbnail.publicUrl type views",
          populate: [
            {
              path: "category",
              select: "title",
            },
            {
              path: "episodes",
              select:
                "episodeVideo.publicUrl title content visibility description",
              options: { sort: { createdAt: 1 }, limit: 1 },
            },
          ],
        })
        .populate({
          path: "novel",
          select: "thumbnail.publicUrl title type view",
          populate: [
            {
              path: "category",
              select: "title",
            },
            {
              path: "chapters",
              select: "chapterPdf.publicUrl name chapterNo content views",
              options: { sort: { createdAt: 1 }, limit: 1 },
            },
            {
              path: "author",
              select: "name",
            },
          ],
        });
    }

    //New released novel and series [Based on latest created]
    const newSeries = await Series.find(query)
      .select("thumbnail.publicUrl title type views")
      .sort({ createdAt: -1 })
      .limit(10)
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
      });
    const newNovels = await Novel.find(query)
      .select("thumbnail.publicUrl title views type")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content views",
        options: { sort: { createdAt: 1 }, limit: 1 },
      })
      .populate({
        path: "category",
        select: "title",
      })
      .populate({
        path: "author",
        select: "name",
      });
    //Series based on episodes total ratings
    const allSeries = await Series.find(query)
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
      });

    const seriesRatings = [];
    for (const series of allSeries) {
      let totalSeriesRating = 0;
      let hasRatedEpisodes = false;
      const episodes = await Episode.find({ series: series._id });
      episodes.forEach((episode) => {
        if (episode.ratings.length > 0) {
          hasRatedEpisodes = true;
          const episodeTotalRating = episode.ratings.reduce(
            (acc, rating) => acc + rating.rating,
            0
          );
          totalSeriesRating += episodeTotalRating;
        }
      });
      if (hasRatedEpisodes) {
        const seriesWithRating = series.toObject();
        seriesWithRating.totalRating = totalSeriesRating;
        seriesRatings.push(seriesWithRating);
      }
    }
    seriesRatings.sort((a, b) => b.totalRating - a.totalRating);
    const topRatedSeries = seriesRatings.slice(0, 5);
    //Novels based on top rated
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
    if (categoryId) {
      topRatedNovelsPipeline.unshift({
        $match: { category: new mongoose.Types.ObjectId(categoryId) },
      });
    }
    const topRatedNovels = await Novel.aggregate(topRatedNovelsPipeline);
    const populatedNovels = await Novel.populate(topRatedNovels, {
      path: "chapters",
      options: { sort: { createdAt: 1 } },
      select: "chapterPdf.publicUrl name chapterNo content views",
    });

    //All record in response
    const data = {
      series,
      novels,
      featuredSeries,
      featuredNovels,
      watchedSeriesNovels,
      newNovels,
      newSeries,
      topRatedNovels: populatedNovels,
      topRatedSeries,
    };
    success(res, "200", "Success", data);
  } catch (err) {
    error500(res, err);
  }
};

//Dashboard Series
const dashboardSeries = async (req, res) => {
  const { categoryId } = req.query;
  let query = {};
  if (categoryId) {
    query.category = categoryId;
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
        options: { sort: { createdAt: 1 }, limit: 1 },
      });
    //Best series
    const bestSeries = await Series.find({
      ...query,
      views: { $gt: 500 },
    })
      .select("thumbnail.publicUrl title type")
      .sort({ views: -1 })
      .limit(10)
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: { sort: { createdAt: 1 }, limit: 1 },
      });
    //Top series
    const topSeries = await Series.find({
      ...query,
      views: { $gt: 0, $lte: 500 },
    })
      .select("thumbnail.publicUrl title type views")
      .sort({ views: -1 })
      .limit(10)
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
      });
    //Series based on episodes total ratings
    const allSeries = await Series.find(query)
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
      });
    const seriesRatings = [];
    for (const series of allSeries) {
      let totalSeriesRating = 0;
      let hasRatedEpisodes = false;
      const episodes = await Episode.find({ series: series._id });
      episodes.forEach((episode) => {
        if (episode.ratings.length > 0) {
          hasRatedEpisodes = true;
          const episodeTotalRating = episode.ratings.reduce(
            (acc, rating) => acc + rating.rating,
            0
          );
          totalSeriesRating += episodeTotalRating;
        }
      });
      if (hasRatedEpisodes) {
        const seriesWithRating = series.toObject();
        seriesWithRating.totalRating = totalSeriesRating;
        seriesRatings.push(seriesWithRating);
      }
    }
    seriesRatings.sort((a, b) => b.totalRating - a.totalRating);
    const topRatedSeries = seriesRatings.slice(0, 10);

    //All record in response
    const data = {
      series,
      bestSeries,
      topSeries,
      topRatedSeries,
    };

    success(res, "200", "Success", data);
  } catch (err) {
    error500(res, err);
  }
};

// Dashboard Novels.
const dashboardNovels = async (req, res) => {
  const { categoryId } = req.query;
  let query = {};
  if (categoryId) {
    query.category = categoryId;
  }
  try {
    //Latest novels
    const novels = await Novel.find(query)
      .select("thumbnail.publicUrl title type")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content views",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      });
    //Best novels
    const bestNovels = await Novel.find({
      ...query,
      views: { $gt: 500 },
    })
      .select("thumbnail.publicUrl title type")
      .sort({ views: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content views",
        options: { sort: { createdAt: 1 }, limit: 1 },
      });
    //Top novels
    const topNovels = await Novel.find({
      ...query,
      views: { $gt: 0, $lte: 500 },
    })
      .select("thumbnail.publicUrl title type views")
      .sort({ views: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content views",
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

    if (categoryId) {
      topRatedNovelsPipeline.unshift({
        $match: { category: new mongoose.Types.ObjectId(categoryId) },
      });
    }
    const topRatedNovels = await Novel.aggregate(topRatedNovelsPipeline);
    const populatedNovels = await Novel.populate(topRatedNovels, {
      path: "chapters",
      options: { sort: { createdAt: 1 } },
      select: "chapterPdf.publicUrl name chapterNo content views",
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

//Best Series
const bestSeries = async (req, res) => {
  const { categoryId } = req.query;
  let query = {};
  if (categoryId) {
    query.category = categoryId;
  }
  try {
    //Best series
    const bestSeries = await Series.find({
      ...query,
      views: { $gt: 500 },
    })
      .select("thumbnail.publicUrl title type views")
      .sort({ views: -1 })
      .limit(10)
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content visibility description",
        options: { sort: { createdAt: 1 }, limit: 1 },
      });
    if (bestSeries.length === 0) {
      return success(res, "200", "Success", bestSeries);
    }
    return success(res, "200", "Success", bestSeries);
  } catch (err) {
    error500(res, err);
  }
};

// Top 10 Series to display on mobile app based on no of views
// const allFeaturedSeries = async (req, res) => {
//   try {
//     const allFeaturedSeries = await Series.find()
//       .sort({ views: -1 })
//       .limit(10)
//       .select(" thumbnail.publicUrl title type")
//       .populate({
//         path: "episodes",
//         select: "episodeVideo.publicUrl content visibility title",
//         options: { sort: { createdAt: 1 }, limit: 1 },
//       });
//     success(res, "200", "Success", allFeaturedSeries);
//   } catch (err) {
//     error500(res, err);
//   }
// };

//New release series novels
// const newReleases = async (req, res) => {
//   try {
//     const novels = await Novel.find()
//       .populate("category")
//       .select("thumbnail type views")
//       .sort({ createdAt: -1 })
//       .limit(10);
//     const series = await Series.find()
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .select("thumbnail.publicUrl type views title")
//       .populate({
//         path: "episodes",
//         select: "episodeVideo.publicUrl content visibility title",
//         options: {
//           sort: {
//             createdAt: 1,
//           },
//           limit: 1,
//         },
//       });
//     const seriesNovels = {
//       novels,
//       series,
//     };
//     success(res, "200", "Success", seriesNovels);
//   } catch (err) {
//     error500(res, err);
//   }
// };

module.exports = {
  adminDashboard,
  appDashboard,
  dashboardSeries,
  bestSeries,
  dashboardNovels,
  // newReleases,
  // allFeaturedSeries,
  // dashboardTopNovels,
};
