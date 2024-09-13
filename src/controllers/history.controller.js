//Models
const History = require("../models/History.model");
// const Series = require("../models/Series.model");
// const Novel = require("../models/Novel.model");
// const Chapter = require("../models/Chapter.model");
// const Episode = require("../models/Episode.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

// const addToHistory = async (req, res) => {
//   const { type, seriesId, episodeId, chapterId, novelId } = req.body;

//   if (type === "Series") {
//     const series = await Series.findById(seriesId);
//     if (!series) {
//       return error409(res, "Series not found");
//     }
//     const episode = await Episode.findById(episodeId);
//     if (!episode) {
//       return error409(res, "Episode not found");
//     }

//     const existHistory = await History.findOne({
//       user: req.user._id,
//       series: seriesId,
//     });

//     if (existHistory) {
//       existHistory.episode = episodeId;
//       await existHistory.save();
//       return status200(res, "Episode of series added to history");
//     }
//     await History.create({
//       user: req.user._id,
//       series: seriesId,
//       episode: episodeId,
//     });
//     return status200(res, "Episode of series added to history");
//   } else if (type === "Novel") {
//     const novel = await Novel.findById(novelId);
//     if (!novel) {
//       return error409(res, "Novel not found");
//     }
//     const chapter = await Chapter.findById(chapterId);
//     if (!chapter) {
//       return error409(res, "Chapter not found");
//     }
//     const existHistory = await History.findOne({
//       user: req.user._id,
//       novel: novelId,
//     });
//     if (existHistory) {
//       existHistory.chapter = chapterId;
//       await existHistory.save();
//       return status200(res, "Chapter of novel added to history");
//     }
//     await History.create({
//       user: req.user._id,
//       novel: novelId,
//       chapter: chapterId,
//     });
//     return status200(res, "Chapter of novel added to history");
//   }
// };

//Get All Histories of Logged in user
const allHistory = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;

  try {
    // Pagination calculations
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalHistoryCount = await History.countDocuments({
      user: req.user._id,
    });
    const skip = (currentPage - 1) * size;
    const limit = size;

    const userHistory = await History.find({ user: req.user._id })
      .select("_id createdAt series episode novel chapter")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate([
        {
          path: "series",
          select:
            "thumbnail.publicUrl title type totalViews seriesRating createdAt",
        },
        {
          path: "episode",
          select:
            "episodeVideo.publicUrl title content totalViews createdAt coins",
          populate: {
            path: "series",
            select: "thumbnail.publicUrl title type totalViews seriesRating",
          },
        },
        {
          path: "novel",
          select:
            "thumbnail.publicUrl title type totalViews averageRating createdAt",
        },
        {
          path: "chapter",
          select:
            "chapterPdf.publicUrl name chapterNo content totalViews createdAt coins",
          populate: {
            path: "novel",
            select: "thumbnail.publicUrl title type totalViews averageRating",
          },
        },
      ])
      .lean();

    // Transform the data
    const transformedData = userHistory
      .map((item) => {
        if (item.episode) {
          return {
            _id: item.episode.series?._id,
            title: item.episode.series?.title,
            type: item.episode.series?.type,
            totalViews: item.episode.series?.totalViews,
            seriesRating: item.episode.series?.seriesRating,
            thumbnail: {
              publicUrl: item.episode.series?.thumbnail?.publicUrl,
            },
            episodes: {
              _id: item.episode._id,
              title: item.episode.title,
              coins: item.episode.coins,
              content: item.episode.content,
              episodeVideo: {
                publicUrl: item.episode.episodeVideo?.publicUrl,
              },
            },
            createdAt: item.createdAt,
          };
        } else if (item.chapter) {
          return {
            _id: item.chapter.novel?._id,
            title: item.chapter.novel?.title,
            type: item.chapter.novel?.type,
            totalViews: item.chapter.novel?.totalViews,
            averageRating: item.chapter.novel?.averageRating,
            chapters: {
              _id: item.chapter._id,
              name: item.chapter.name,
              coins: item.chapter.coins,
              content: item.chapter.content,
              chapterPdf: {
                publicUrl: item.chapter.chapterPdf?.publicUrl,
              },
            },
            thumbnail: {
              publicUrl: item.chapter.novel?.thumbnail?.publicUrl,
            },
            createdAt: item.createdAt,
          };
        } else {
          // If neither episode nor chapter, return null
          return null;
        }
      })
      .filter((item) => item !== null);

    // To handle infinite scroll on frontend
    const hasMore = skip + limit < totalHistoryCount;

    const data = {
      userHistory: transformedData,
      hasMore,
    };

    return success(res, "200", "All history record", data);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  // addToHistory,
  allHistory,
};
