//Models
const MyList = require("../models/MyList.model");
const Chapter = require("../models/Chapter.model");
const Episode = require("../models/Episode.model");
//Response and errors
const {
  error500,
  error409,
  customError,
  error400,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

//Add Episode to list
const addEpisodeToList = async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;

  if (!type) {
    return error400(res, "Type is required");
  }
  if (type !== "Episode" && type !== "Chapter") {
    return error400(res, "Type must be either Episode or Chapter");
  }

  try {
    if (type === "Episode") {
      const alreadyExist = await MyList.findOne({
        episode: id,
        user: req.user._id,
      }).lean();
      if (alreadyExist) {
        await MyList.deleteOne({
          _id: alreadyExist._id,
        });
        return status200(res, "Episode removed from my list");
      }
      const episodeExist = await Episode.findById(id).lean();
      if (!episodeExist) {
        return error409(res, "No such episode exist");
      }
      await MyList.create({
        episode: id,
        user: req.user._id,
      });
    } else if (type === "Chapter") {
      const alreadyExist = await MyList.findOne({
        chapter: id,
        user: req.user._id,
      }).lean();
      if (alreadyExist) {
        await MyList.deleteOne({
          _id: alreadyExist._id,
        });
        return status200(res, "Chapter removed from my list");
      }
      const chapterExist = await Chapter.findById(id).lean();
      if (!chapterExist) {
        return error409(res, "No such chapter exist");
      }
      await MyList.create({
        chapter: id,
        user: req.user._id,
      });
    }
    return status200(res, `${type} added to list`);
  } catch (err) {
    return error500(res, err);
  }
};

//Get All of List
const allMyLists = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;

  try {
    // Pagination calculations
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalListCount = await MyList.countDocuments({ user: req.user._id });
    const skip = (currentPage - 1) * size;
    const limit = size;

    const allMyLists = await MyList.find({ user: req.user._id })
      .select("episode chapter createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "episode",
        select: "title series totalViews coins createdAt",
        populate: {
          path: "series",
          select:
            "thumbnail.publicUrl title type seriesRating totalViews createdAt",
          populate: {
            path: "category",
            select: "title",
          },
        },
      })
      .populate({
        path: "chapter",
        select: "name novel totalViews chapterNo coins createdAt",
        populate: {
          path: "novel",
          select:
            "thumbnail.publicUrl title type averageRating totalViews createdAt",
          populate: {
            path: "category",
            select: "title",
          },
        },
      });

    const transformedData = allMyLists
      .map((item) => {
        if (item.episode) {
          return {
            _id: item.episode.series._id,
            title: item.episode.series.title,
            type: item.episode.series.type,
            totalViews: item.episode.series.totalViews,
            seriesRating: item?.episode?.series?.seriesRating,
            thumbnail: {
              publicUrl: item?.episode?.series?.thumbnail?.publicUrl,
            },
            episodes: {
              _id: item.episode._id,
              title: item.episode.title,
              coins: item.episode.coins,
              content: item.episode.content,
              episodeVideo: {
                publicUrl: item.episode.episodeVideo.publicUrl,
              },
            },
            createdAt: item.createdAt,
          };
        } else if (item.chapter) {
          return {
            _id: item.chapter.novel._id,
            title: item.chapter.novel.title,
            type: item?.chapter?.novel?.type,
            totalViews: item?.chapter?.novel?.totalViews,
            averageRating: item?.chapter?.novel?.averageRating,
            chapters: {
              _id: item.chapter._id,
              name: item.chapter.name,
              coins: item.chapter.coins,
              content: item.chapter.content,
              chapterPdf: {
                publicUrl: item.chapter.chapterPdf.publicUrl,
              },
            },
            thumbnail: {
              publicUrl: item.chapter.novel.thumbnail.publicUrl,
            },
            createdAt: item.createdAt,
          };
        } else {
          return null;
        }
      })
      .filter((item) => item !== null);

    // To handle infinite scroll on frontend
    const hasMore = skip + limit < totalListCount;

    const data = {
      myList: transformedData,
      hasMore,
    };

    return success(res, "200", "All list record", data);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addEpisodeToList,
  allMyLists,
};
