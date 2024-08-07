//Models
const Novel = require("../models/Novel.model");
const Series = require("../models/Series.model");
const History = require("../models/History.model");
//Responses and errors
const { error500 } = require("../services/helpers/errors");
const { success } = require("../services/helpers/response");

//Get User based like
// const mightLike = async (req, res) => {
//   const { page = 1, pageSize = 10 } = req.query;
//   try {
//     const userId = new mongoose.Types.ObjectId(req.user._id);
//     // Fetch relevant categories from Novel reviews
//     const novelCategories = await Novel.aggregate([
//       { $unwind: "$reviews" },
//       { $match: { "reviews.user": userId } },
//       { $group: { _id: "$category" } },
//     ]);
//     const categoryIds = novelCategories.map((category) => category._id);
//     // Fetch all relevant novels without pagination
//     const allMightLikedNovels = await Novel.find({
//       status: "Published",
//       visibility: "Public",
//       category: { $in: categoryIds },
//       "reviews.user": { $ne: userId },
//     })
//       .select(
//         "thumbnail.publicUrl title description totalViews category createdAt"
//       )
//       .populate("category", "title");
//     // Fetch liked episodes and related series
//     const likedEpisodes = await Episode.find({
//       "ratings.user": userId,
//     }).populate("series");
//     const seriesCategories = likedEpisodes.map(
//       (episode) => episode.series.category
//     );
//     const likedEpisodeSeries = likedEpisodes.map(
//       (episode) => episode.series._id
//     );
//     const allMightLikeSeries = await Series.find({
//       status: "Published",
//       visibility: "Public",
//       category: { $in: seriesCategories },
//       _id: { $nin: likedEpisodeSeries },
//     })
//       .select(
//         "thumbnail.publicUrl title description totalViews category createdAt"
//       )
//       .populate("category", "title");
//     // Calculate pagination details
//     const currentPage = parseInt(page, 10) || 1;
//     const size = parseInt(pageSize, 10) || 10;
//     const totalNovelsCount = allMightLikedNovels.length;
//     const totalSeriesCount = allMightLikeSeries.length;
//     let novelCount = Math.min(Math.ceil(size / 2), totalNovelsCount);
//     let seriesCount = Math.min(size - novelCount, totalSeriesCount);
//     if (novelCount + seriesCount < size) {
//       if (totalNovelsCount > novelCount) {
//         novelCount = Math.min(size - seriesCount, totalNovelsCount);
//       }
//       if (totalSeriesCount > seriesCount) {
//         seriesCount = Math.min(size - novelCount, totalSeriesCount);
//       }
//     }
//     // Calculate offset for pagination
//     const offset = (currentPage - 1) * size;
//     // Slice the results based on offset and count
//     const novels = allMightLikedNovels.slice(offset, offset + novelCount);
//     const series = allMightLikeSeries.slice(offset, offset + seriesCount);
//     // Merge and sort by createdAt
//     const mergedResults = [...novels, ...series].sort(
//       (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//     );
//     // Determine hasMore flag
//     const hasMore =
//       offset + novelCount < totalNovelsCount ||
//       offset + seriesCount < totalSeriesCount;
//     const data = {
//       results: mergedResults,
//       hasMore,
//     };
//     return success(res, "200", "All might liked novels and series", data);
//   } catch (err) {
//     return error500(res, err);
//   }
// };

const mightLike = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  try {
    //User history
    const history = await History.find({ user: req.user._id })
      .populate("series")
      .populate("novel");

    const seriesCategories = history
      .map((record) => record?.series?.category)
      .filter(Boolean);
    const novelCategories = history
      .map((record) => record?.novel?.category)
      .filter(Boolean);

    // Get history IDs
    const historySeriesIds = await History.distinct("series", {
      user: req.user._id,
    });
    const historyNovelIds = await History.distinct("novel", {
      user: req.user._id,
    });

    const mightLikeSeries = await Series.find({
      category: { $in: seriesCategories },
      _id: { $nin: historySeriesIds },
    })
      .select("thumbnail.publicUrl title type seriesRating totalViews")
      .populate({
        path: "category",
        select: "title",
      })
      .populate({
        path: "episodes",
        select:
          "episodeVideo.publicUrl title content coins totalViews",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .lean();

    const mightLikeNovels = await Novel.find({
      category: { $in: novelCategories },
      _id: { $nin: historyNovelIds },
    })
      .select("thumbnail.publicUrl title type averageRating totalViews")
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content coins",
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
      .lean();

    const combinedData = [...mightLikeSeries, ...mightLikeNovels]
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

    const startIndex = (page - 1) * pageSize;
    const endIndex = page * pageSize;
    const mightLiked = combinedData.slice(startIndex, endIndex);
    const hasMore = combinedData.length > endIndex;

    const data = {
      mightLiked,
      hasMore,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  mightLike,
};
