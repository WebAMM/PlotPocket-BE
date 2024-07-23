//Models
const Novel = require("../models/Novel.model");
const Series = require("../models/Series.model");
const User = require("../models/User.model");
const Episode = require("../models/Episode.model");
const History = require("../models/History.model");
const Chapter = require("../models/Chapter.model");

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

//Global Search Novels + Series
const globalSearch = async (req, res) => {
  const { title } = req.query;

  try {
    const regex = new RegExp(`.*${title}.*`, "i");
    const novels = await Novel.find({
      title: {
        $regex: regex,
      },
    })
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

    const series = await Series.find({
      title: {
        $regex: regex,
      },
    })
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

    const combined = [...series, ...novels];
    return success(res, "200", "Success", combined);
  } catch (err) {
    return error500(res, err);
  }
};

// Single novel/series detail with comments + might like.
const singleDetailPage = async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

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
            select: "chapterPdf.publicUrl chapterNo content views createdAt",
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

      //For Might like
      const categories = await Novel.aggregate([
        { $unwind: "$reviews" },
        {
          $match: { "reviews.user": new mongoose.Types.ObjectId(req.user._id) },
        },
        { $group: { _id: "$category" } },
      ]);

      const categoryIds = categories.map((category) => category._id);

      mightLike = await Novel.find({
        category: { $in: categoryIds },
        "reviews.user": { $ne: new mongoose.Types.ObjectId(req.user._id) },
      })
        .select("thumbnail.publicUrl title description views category")
        .populate("category", "title")
        .populate(
          "chapters",
          "chapterPdf.publicUrl chapterNo content views createdAt"
        );
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
            },
          },
        ]);

      //For Might like
      const episodesUserRated = await Episode.find({
        "ratings.user": req.user._id,
      }).select("series");

      //If user like 5 episode of same series so need to have just one series of that episode
      const filteredSeriesId = episodesUserRated.filter((id) => id);

      const sameCategorySeries = await Series.find({
        _id: {
          $in: filteredSeriesId,
        },
      }).select("category");

      const categoryIds = sameCategorySeries.map((series) => series.category);

      mightLike = await Series.find({
        category: {
          $in: categoryIds,
        },
      }).limit(10);
    }

    const data = {
      singleContent: content,
      mightLike,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

const topRanked = async (req, res) => {
  const { categoryId } = req.query;
  const { latest } = req.body;
  let query;

  const sortSeriesOptions = {
    seriesRating: -1,
  };

  const sortNovelOptions = {
    totalRating: -1,
  };

  if (latest) {
    sortSeriesOptions.createdAt = -1;
    sortNovelOptions.createdAt = -1;
  }

  if (categoryId) {
    query.category = categoryId;
  }

  try {
    //Top ranked series
    const topRatedSeries = await Series.find(query)
      .select("thumbnail.publicUrl title view type seriesRating")
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
      .sort(sortSeriesOptions);

    //Top ranked novels
    const topRatedNovelsPipelines = [
      { $unwind: "$reviews" },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          category: { $first: "$category" },
          type: { $first: "$type" },
          chapters: { $first: "$chapters" },
          thumbnail: { $first: { publicUrl: "$thumbnail.publicUrl" } },
          totalRating: { $avg: "$reviews.rating" },
        },
      },
      { $sort: sortNovelOptions },
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
      topRatedNovelsPipelines.unshift({
        $match: { category: new mongoose.Types.ObjectId(categoryId) },
      });
    }

    const topRatedNovels = await Novel.aggregate(topRatedNovelsPipelines);
    const populatedNovels = await Novel.populate(topRatedNovels, {
      path: "chapters",
      options: { sort: { createdAt: 1 }, limit: 1 },
      select: "chapterPdf.publicUrl name chapterNo content views",
    });

    const data = {
      topRatedSeries,
      topRatedNovel: populatedNovels,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

const increaseView = async (req, res) => {
  const { type, seriesId, episodeId, chapterId, novelId } = req.body;
  // Increase series views
  if (!req.user._id) {
    return error400(res, "User not found");
  }

  if (req.user._id) {
    if (type === "Series") {
      const series = await Series.findById(seriesId);
      if (!series) {
        return error400(res, "Series not found");
      }
      const episode = await Episode.findById(episodeId);
      if (!episode) {
        return error400(res, "Episode not found");
      }
      const alreadyViewedSeries = series.views.find(
        (viewRec) => viewRec.user == req.user._id
      );
      const alreadyViewedEpisode = episode.views.find(
        (viewRec) => viewRec.user == req.user._id
      );
      if (alreadyViewedSeries) {
        await Series.updateOne(
          {
            _id: seriesId,
          },
          {
            "views.$[elem].date": new Date(),
          },
          {
            arrayFilters: [
              {
                "elem.user": new mongoose.Types.ObjectId(req.user._id),
              },
            ],
            runValidators: true,
          }
        );
      } else {
        await Series.updateOne(
          {
            _id: seriesId,
          },
          {
            $push: {
              views: {
                user: new mongoose.Types.ObjectId(req.user._id),
                view: 1,
                date: new Date(),
              },
            },
            $inc: { totalViews: 1 },
          },
          { runValidators: true }
        );
      }
      if (alreadyViewedEpisode) {
        await Episode.updateOne(
          {
            _id: episodeId,
          },
          {
            "views.$[elem].date": new Date(),
          },
          {
            arrayFilters: [
              {
                "elem.user": new mongoose.Types.ObjectId(req.user._id),
              },
            ],
            runValidators: true,
          }
        );
      } else {
        await Episode.updateOne(
          {
            _id: episodeId,
          },
          {
            $push: {
              views: {
                user: new mongoose.Types.ObjectId(req.user._id),
                view: 1,
                date: new Date(),
              },
            },
            $inc: { totalViews: 1 },
          },
          {
            runValidators: true,
          }
        );
      }
      return status200(res, "Series and episodes views increased");
    } else if (type === "Novel") {
      const novel = await Novel.findById(novelId);
      if (!novel) {
        return error400(res, "Novel not found");
      }
      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        return error400(res, "Chapter not found");
      }
      const alreadyViewedNovel = novel.views.find(
        (viewRec) => viewRec.user == req.user._id
      );
      if (alreadyViewedNovel) {
        await Novel.updateOne(
          {
            _id: novelId,
          },
          {
            "views.$[elem].date": new Date(),
          },
          {
            arrayFilters: [
              {
                "elem.user": new mongoose.Types.ObjectId(req.user._id),
              },
            ],
          }
        );
        return status200(res, "Novel and chapters views increased");
      } else {
        await Novel.updateOne(
          {
            _id: novelId,
          },
          {
            $push: {
              views: {
                user: new mongoose.Types.ObjectId(req.user._id),
                view: 1,
                date: new Date(),
              },
            },
            $inc: { totalViews: 1 },
          },
          {
            runValidators: true,
          }
        );
      }
      const alreadyViewedChapter = chapter.views.find(
        (viewRec) => viewRec.user == req.user._id
      );
      if (alreadyViewedChapter) {
        Chapter.updateOne(
          {
            _id: chapterId,
          },
          {
            "views.$[elem].date": new Date(),
          },
          {
            arrayFilters: [
              {
                "elem.user": new mongoose.Type.ObjectId(req.user._id),
              },
            ],
          }
        );
      } else {
        Chapter.updateOne(
          {
            _id: chapterId,
          },
          {
            $push: {
              views: {
                user: new mongoose.Types.ObjectId(req.user._id),
                view: 1,
                date: new Date(),
              },
            },
            $inc: { totalViews: 1 },
          },
          {
            runValidators: true,
          }
        );
      }
    }
  }
};

module.exports = {
  globalSearch,
  singleDetailPage,
  topRanked,
  increaseView,
};
