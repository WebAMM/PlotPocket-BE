//Models
const Novel = require("../models/Novel.model");
const Series = require("../models/Series.model");
const Episode = require("../models/Episode.model");
const Chapter = require("../models/Chapter.model");
const Category = require("../models/Category.model");
const History = require("../models/History.model");
const SearchHistory = require("../models/SearchHistory.model");
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
const {
  updateViews,
  updateCategoryViews,
} = require("../services/helpers/incViews");

//Global Search Novels + Series
const globalSearch = async (req, res) => {
  const { title } = req.query;
  try {
    if (!title) {
      return error400(res, "Title is required");
    }
    const regex = new RegExp(`.*${title}.*`, "i");
    const novels = await Novel.find({
      status: "Published",
      visibility: "Public",
      title: {
        $regex: regex,
      },
    })
      .select("thumbnail.publicUrl title type")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      });
    const series = await Series.find({
      status: "Published",
      visibility: "Public",
      title: {
        $regex: regex,
      },
    })
      .select("thumbnail.publicUrl title type")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "episodes",
        select:
          "episodeVideo.publicUrl title content visibility description coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      });

    const combined = [...series, ...novels];
    return success(res, "200", "Success", combined);
  } catch (err) {
    return error500(res, err);
  }
};

const increaseView = async (req, res) => {
  const { type, seriesId, episodeId, chapterId, novelId } = req.body;
  if (type === "Series") {
    const series = await updateViews(Series, seriesId, req.user._id);
    if (!series) {
      return error409(res, "Series not found");
    }
    const episode = await updateViews(Episode, episodeId, req.user._id);
    if (!episode) {
      return error409(res, "Episode not found");
    }
    await updateCategoryViews(series.category, req.user._id);
    return status200(res, "Series and episodes views increased");
  } else if (type === "Novels") {
    const novel = await updateViews(Novel, novelId, req.user._id);
    if (!novel) {
      return error409(res, "Novel not found");
    }
    const chapter = await updateViews(Chapter, chapterId, req.user._id);
    if (!chapter) {
      return error409(res, "Chapter not found");
    }
    await updateCategoryViews(novel.category, req.user._id);
    return status200(res, "Novel and chapters views increased");
  }
};

// Single novel/series detail with comments + might like.
const singleDetailPage = async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;
  const { fromSearch } = req.body;
  let content;
  let mightLike;

  try {
    if (type === "Novel") {
      content = await Novel.findById(id)
        .select("thumbnail.publicUrl title type language description")
        .populate([
          {
            path: "author",
            select: "authorPic.publicUrl name",
          },
          {
            path: "category",
            select: "title",
          },
          {
            path: "chapters",
            select:
              "chapterPdf.publicUrl chapterNo content totalViews createdAt",
            options: {
              sort: { createdAt: 1 },
              limit: 1,
            },
          },
          {
            path: "reviews",
            select: "rating comment totalLikes createdAt",
            populate: {
              path: "user",
              select: "profileImage.publicUrl userName email",
            },
          },
        ])
        .lean();

      if (!content) {
        return error404(res, "Novel not found");
      }

      const totalChapters = await Chapter.find({
        novel: id,
      }).countDocuments();

      if (content.reviews?.length) {
        content.reviews = content.reviews.map((review) => ({
          rating: review.rating,
          comment: review.comment,
          totalLikes: review.totalLikes,
          createdAt: review.createdAt,
          user: {
            profileImage: review.user.profileImage,
            userName: review.user.userName,
            email: review.user.email,
          },
        }));
      }

      content = { ...content, totalChapters };
      //For Might like
      const history = await History.find({ user: req.user._id }).populate(
        "novel"
      );
      const novelCategories = history
        .map((record) => record.novel?.category)
        .filter(Boolean);
      const historyNovelIds = await History.distinct("novel", {
        user: req.user._id,
      });

      mightLike = await Novel.find({
        category: { $in: novelCategories },
        _id: { $nin: historyNovelIds },
      })
        .select("thumbnail.publicUrl title type totalViews")
        .limit(10)
        .sort({ createdAt: -1 })
        .populate({
          path: "chapters",
          select:
            "chapterPdf.publicUrl name chapterNo content totalViews coins",
          options: {
            sort: { createdAt: 1 },
            limit: 1
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .populate({
          path: "author",
          select: "name",
        });

      if (fromSearch) {
        const existSearchHistory = await SearchHistory.findOne({
          user: req.user._id,
          novel: content._id,
        });
        if (!existSearchHistory) {
          await SearchHistory.create({
            user: req.user._id,
            novel: content._id,
          });
        }
      }
    } else if (type === "Series") {
      content = await Series.findById(id)
        .select("thumbnail.publicUrl title description")
        .populate([
          {
            path: "category",
            select: "title",
          },
          {
            path: "episodes",
            select:
              "episodeVideo.publicUrl title content visibility description",
            options: {
              sort: {
                createdAt: 1,
              },
              limit: 1,
            },
          },
        ])
        .lean();

      if (!content) {
        return error404(res, "Series not found");
      }

      const totalEpisode = await Episode.find({
        series: id,
      }).countDocuments();

      content = { ...content, totalEpisode };

      //For Might like
      const history = await History.find({ user: req.user._id }).populate(
        "series"
      );
      const seriesCategories = history
        .map((record) => record.series?.category)
        .filter(Boolean);
      // Get history IDs
      const historySeriesIds = await History.distinct("series", {
        user: req.user._id,
      });

      mightLike = await Series.find({
        category: { $in: seriesCategories },
        _id: { $nin: historySeriesIds },
      })
        .limit(10)
        .sort({ createdAt: -1 })
        .select("thumbnail.publicUrl title type seriesRating")
        .populate({
          path: "episodes",
          select:
            "episodeVideo.publicUrl title content visibility description coins",
          options: {
            sort: { createdAt: 1 },
            limit: 1
          },
        })
        .populate({
          path: "category",
          select: "title",
        });

      if (fromSearch) {
        const existSearchHistory = await SearchHistory.findOne({
          user: req.user._id,
          series: content._id,
        });
        if (!existSearchHistory) {
          await SearchHistory.create({
            user: req.user._id,
            series: content._id,
          });
        }
      }
    }

    const data = {
      detail: content,
      mightLike,
    };
    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

const combinedSeriesNovels = async (req, res) => {
  const { type, category, pageSize = 10, page = 1, day } = req.query;
  let series = [];
  let novels = [];

  try {
    if (type != "Featured" && type != "Latest" && type != "TopRanked") {
      return error400(res, "Invalid type");
    }

    if (type === "Featured") {
      // Query
      let query = {
        status: "Published",
        visibility: "Public",
        totalViews: { $gte: 10 },
      };
      // Filtering based on category
      if (category) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error404(res, "Category not found");
        }
        query.category = category;
      }
      series = await Series.find(query)
        .select("thumbnail.publicUrl title type seriesRating totalViews")
        .sort({ totalViews: -1 })
        .populate({
          path: "episodes",
          select:
            "episodeVideo.publicUrl title content visibility description coins",
          options: {
            sort: { createdAt: 1 },
            limit: 1
          },
        });
      novels = await Novel.find(query)
        .select("thumbnail.publicUrl title type averageRating totalViews")
        .sort({ totalViews: -1 })
        .populate({
          path: "chapters",
          select:
            "chapterPdf.publicUrl name chapterNo content totalViews coins",
          options: {
            sort: { createdAt: 1 },
             limit: 1
          },
        });
    } else if (type === "Latest") {
      //Query
      let query = {
        status: "Published",
        visibility: "Public",
      };
      //Filtering based on category
      if (category) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error404(res, "Category not found");
        }
        query.category = category;
      }
      series = await Series.find(query)
        .select("thumbnail.publicUrl title type totalViews")
        .sort({ createdAt: -1 })
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
        });
      novels = await Novel.find(query)
        .select("thumbnail.publicUrl title type totalViews")
        .sort({ createdAt: -1 })
        .populate({
          path: "chapters",
          select:
            "chapterPdf.publicUrl name chapterNo content totalViews coins",
          options: {
            sort: { createdAt: 1 },
            limit: 1
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .populate({
          path: "author",
          select: "name",
        });
    } else if (type === "TopRanked") {
      //Query
      let query = {
        status: "Published",
        visibility: "Public",
      };
      //Sorting Options
      let sortSeriesOptions = {
        seriesRating: -1,
        createdAt: -1,
      };
      let sortNovelOptions = {
        averageRating: -1,
        createdAt: -1,
      };
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
      //New
      // if (latest) {
      //   sortSeriesOptions.createdAt = -1;
      //   sortNovelOptions.createdAt = -1;
      // }
      //Filtering based on Category
      if (category) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error409(res, "Category don't exist");
        }
        query.category = category;
      }

      series = await Series.find({
        ...query,
        seriesRating: { $gte: 1 },
      })
        .select("thumbnail.publicUrl title view type seriesRating")
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
        .sort(sortSeriesOptions);
      novels = await Novel.find({
        ...query,
        averageRating: { $gte: 1 },
      })
        .select("thumbnail.publicUrl averageRating type title averageRating")
        .populate({
          path: "chapters",
          select:
            "chapterPdf.publicUrl name chapterNo content totalViews coins",
          options: {
            sort: { createdAt: 1 },
             limit: 1
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
        .sort(sortNovelOptions);
    }

    const combinedData = [...series, ...novels].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const startIndex = (page - 1) * pageSize;
    const endIndex = page * pageSize;
    const seriesNovels = combinedData.slice(startIndex, endIndex);
    const hasMore = combinedData.length > endIndex;

    const data = {
      seriesNovels,
      hasMore,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

// All featured series and novel
// const featuredSeriesNovels = async (req, res) => {
//   const { category, pageSize = 10, page = 1 } = req.query;
//   const limit = Math.floor(pageSize / 2);
//   const skip = (page - 1) * limit;
//   // Query
//   let query = {
//     status: "Published",
//     visibility: "Public",
//     totalViews: { $gte: 10 },
//   };
//   try {
//     // Filtering based on category
//     if (category) {
//       const existCategory = await Category.findById(category);
//       if (!existCategory) {
//         return error404(res, "Category not found");
//       }
//       query.category = category;
//     }
//     // Fetch Series and Novels
//     const featuredSeries = await Series.find(query)
//       .select("thumbnail.publicUrl title type seriesRating")
//       .sort({ totalViews: -1 })
//       .populate({
//         path: "episodes",
//         select: "episodeVideo.publicUrl title content visibility description coins",
//         options: { sort: { createdAt: 1 }, limit: 1 },
//       })
//       .skip(skip)
//       .limit(limit);
//     const featuredNovels = await Novel.find(query)
//       .select("thumbnail.publicUrl title type averageRating")
//       .sort({ totalViews: -1 })
//       .populate({
//         path: "chapters",
//         select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
//         options: { sort: { createdAt: 1 }, limit: 1 },
//       })
//       .skip(skip)
//       .limit(limit);
//     const seriesAndNovels = [...featuredSeries, ...featuredNovels].sort(
//       (a, b) => b.createdAt - a.createdAt
//     );
//     // Check if there are more results to fetch
//     const hasMore = page * pageSize < totalItems;
//     const data = {
//       seriesAndNovels,
//       hasMore,
//     };
//     return success(res, "200", "Success", data);
//   } catch (err) {
//     return error500(res, err);
//   }
// };
// const latestSeriesNovels = async (req, res) => {
//   const { category, page = 1, pageSize = 10 } = req.query;
//   const limit = Math.floor(pageSize / 2);
//   const skip = (page - 1) * limit;
//   //Query's
//   let query = {
//     status: "Published",
//     visibility: "Public",
//   };
//   //Filtering based on Category
//   if (category) {
//     const existCategory = await Category.findById(category);
//     if (!existCategory) {
//       return error404(res, "Category not found");
//     }
//     query.category = category;
//   }
//   try {
//     const latestSeries = await Series.find(query)
//       .select("thumbnail.publicUrl title type totalViews")
//       .sort({ createdAt: -1 })
//       .populate({
//         path: "episodes",
//         select: "episodeVideo.publicUrl title content visibility description coins",
//         options: {
//           sort: {
//             createdAt: 1,
//           },
//           limit: 1,
//         },
//       })
//       .populate({
//         path: "category",
//         select: "title",
//       })
//       .skip(skip)
//       .limit(limit);
//     const latestNovels = await Novel.find(query)
//       .select("thumbnail.publicUrl title type totalViews")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate({
//         path: "chapters",
//         select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
//         options: { sort: { createdAt: 1 }, limit: 1 },
//       })
//       .populate({
//         path: "category",
//         select: "title",
//       })
//       .populate({
//         path: "author",
//         select: "name",
//       });
//     const seriesAndNovels = [...latestSeries, ...latestNovels].sort(
//       (a, b) => b.createdAt - a.createdAt
//     );
//     const hasMore = page * pageSize < totalItems;
//     const data = {
//       seriesAndNovels,
//       hasMore,
//     };
//     return success(res, "200", "Success", data);
//   } catch (err) {
//     return error500(res, err);
//   }
// };
// const topRankedSeriesNovel = async (req, res) => {
//   const { category, latest, day, page = 1, pageSize = 10 } = req.query;
//   const limit = Math.floor(pageSize / 2);
//   const skip = (page - 1) * limit;
//   let query = {
//     status: "Published",
//     visibility: "Public",
//   };
//   let sortSeriesOptions = {
//     seriesRating: -1,
//   };
//   let sortNovelOptions = {
//     averageRating: -1,
//   };
//   //Filtering based on Day
//   if (day) {
//     const parsedDay = parseInt(day);
//     if (![7, 14, 30].includes(parsedDay)) {
//       return error400(res, "Invalid date parameter");
//     }
//     const today = new Date();
//     const startDate = new Date();
//     startDate.setDate(today.getDate() - day);
//     query.createdAt = {
//       $gte: startDate,
//       $lte: today,
//     };
//   }
//   //New Book and New Novel
//   if (latest) {
//     sortSeriesOptions.createdAt = -1;
//     sortNovelOptions.createdAt = -1;
//   }
//   try {
//     if (category) {
//       const existCategory = await Category.findById(category);
//       if (!existCategory) {
//         return error409(res, "Category don't exist");
//       }
//       query.category = category;
//     }
//     //Top ranked series
//     const topRankedSeries = await Series.find({
//       ...query,
//       seriesRating: { $gte: 1 },
//     })
//       .select("thumbnail.publicUrl title view type seriesRating")
//       .populate({
//         path: "episodes",
//         select: "episodeVideo.publicUrl title content visibility description coins",
//         options: {
//           sort: {
//             createdAt: 1,
//           },
//           limit: 1,
//         },
//       })
//       .populate({
//         path: "category",
//         select: "title",
//       })
//       .sort(sortSeriesOptions)
//       .skip(skip)
//       .limit(limit);
//     //Top ranked novels
//     const topRankedNovels = await Novel.find({
//       ...query,
//       averageRating: { $gte: 1 },
//     })
//       .select("thumbnail.publicUrl averageRating type title averageRating")
//       .populate({
//         path: "chapters",
//         select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
//         options: { sort: { createdAt: 1 }, limit: 1 },
//       })
//       .populate({
//         path: "category",
//         select: "title",
//       })
//       .populate({
//         path: "author",
//         select: "name",
//       })
//       .sort(sortNovelOptions)
//       .skip(skip)
//       .limit(limit);
//     const seriesAndNovels = [...topRankedSeries, ...topRankedNovels].sort(
//       (a, b) => b.createdAt - a.createdAt
//     );
//     const hasMore = page * pageSize < totalItems;
//     const data = {
//       seriesAndNovels,
//       hasMore,
//     };
//     return success(res, "200", "Success", data);
//   } catch (err) {
//     return error500(res, err);
//   }
// };

module.exports = {
  globalSearch,
  increaseView,
  singleDetailPage,
  combinedSeriesNovels,
  // featuredSeriesNovels,
  // latestSeriesNovels,
  // topRankedSeriesNovel,
};
