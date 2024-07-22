//Models
const Novel = require("../models/Novel.model");
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
//helpers and functions
const cloudinary = require("../services/helpers/cloudinary").v2;
const mongoose = require("mongoose");
const Category = require("../models/Category.model");
const Author = require("../models/Author.model");

//Publish the novel
const addNovel = async (req, res) => {
  try {
    const { title, category, author, draftId } = req.body;
    if (draftId) {
      const draftNovel = await Novel.findById({
        _id: draftId,
        status: "Draft",
      });
      if (!draftNovel) {
        return error409(res, "Novel not found in draft");
      }
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category don't exist");
      }
      if (existCategory.type !== "Novels") {
        return error400(res, "Category type don't belong to novels");
      }
      const existAuthor = await Author.findById(author);
      if (!existAuthor) {
        return error409(res, "Author don't exist");
      }
      if (draftNovel.thumbnail.publicUrl) {
        await Novel.updateOne(
          {
            _id: draftId,
          },
          {
            ...req.body,
            status: "Published",
          }
        );
      } else if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: "image",
          folder: "novel",
        });
        await Novel.updateOne(
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
        return status200(res, "Novel published successfully");
      } else {
        return error400(res, "Thumbnail is required");
      }
    } else {
      const existNovel = await Novel.findOne({ title, status: "Published" });
      if (existNovel) {
        return error409(res, "Novel already exist");
      }
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category don't exist");
      }
      if (existCategory.type !== "Novels") {
        return error409(res, "Category type don't belong to novels");
      }
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: "image",
          folder: "novel",
        });
        await Novel.create({
          ...req.body,
          status: "Published",
          thumbnail: {
            publicUrl: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format,
          },
        });
        return status200(res, "Novel published successfully");
      } else {
        return error400(res, "Thumbnail is required");
      }
    }
  } catch (err) {
    error500(res, err);
  }
};

//Draft Novel
const addNovelToDraft = async (req, res) => {
  try {
    const { title, category } = req.body;
    if (title) {
      const existNovel = await Novel.findOne({ title });
      if (existNovel) {
        return error409(res, "Novel already exist");
      }
    }

    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category don't exist");
      }
      if (existCategory.type !== "Novels") {
        return error400(res, "Category type don't belong to novel");
      }
    }
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        folder: "novel",
      });
      await Novel.create({
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
      await Novel.create({
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
    return status200(res, "Novel saved as draft");
  } catch (err) {
    error500(res, err);
  }
};

// Get All Novels
const getAllNovels = async (req, res) => {
  try {
    const novels = await Novel.find()
      .select(
        "_id thumbnail.publicUrl title description createdAt views visibility language reviews status"
      )
      // .populate({
      //   path: "reviews",
      // populate: {
      //   path: "user",
      //   select: "userName profileImage.publicUrl",
      // },
      // select: "rating comment totalLikes createdAt",
      // })
      .populate({
        path: "category",
        select: "_id title",
      })
      .populate({
        path: "author",
        select: "authorPic.publicUrl name gender",
      })
      .populate("chapters");

    if (novels.length === 0) {
      return success(res, "200", "Success", novels);
    }

    const allNovels = novels.map((novel) => ({
      _id: novel._id,
      thumbnail: novel.thumbnail,
      title: novel.title,
      description: novel.description,
      publishDate: novel.createdAt,
      views: novel.views,
      visibility: novel.visibility,
      language: novel.language,
      totalChapters: novel.chapters.length,
      category: novel.category,
      author: novel.author,
      // reviews: novel.reviews.map((review) => ({
      //   user: {
      //     profileImage: review.user.profileImage,
      //     _id: review.user._id,
      //     name: review.user.name,
      //     gender: review.user.gender,
      //   },
      //   rating: review.rating,
      //   comment: review.comment,
      //   totalLikes: review.totalLikes,
      //   createdAt: review.createdAt,
      // })),
      reviews: novel.reviews.length || 0,
    }));

    success(res, "200", "Success", allNovels);
  } catch (err) {
    error500(res, err);
  }
};

// Get All Novels of Author
const getAuthorNovels = async (req, res) => {
  const { id } = req.params;
  try {
    const authorExist = await Author.findById(id);
    if (!authorExist) {
      return error404(res, "Author not found");
    }
    const novels = await Novel.find({
      author: id,
    })
      .select(
        "_id thumbnail.publicUrl title description createdAt views visibility language reviews"
      )
      .populate({
        path: "category",
        select: "_id title",
      })
      .populate({
        path: "author",
        select: "authorPic.publicUrl name gender",
      })
      .populate("chapters");

    if (novels.length === 0) {
      return success(res, "200", "Success", novels);
    }

    const allNovels = novels.map((novel) => ({
      _id: novel._id,
      thumbnail: novel.thumbnail,
      title: novel.title,
      description: novel.description,
      publishDate: novel.createdAt,
      views: novel.views,
      visibility: novel.visibility,
      language: novel.language,
      totalChapters: novel.chapters.length,
      category: novel.category,
      author: novel.author,
      reviews: novel.reviews,
    }));

    success(res, "200", "Success", allNovels);
  } catch (err) {
    error500(res, err);
  }
};

const editNovel = async (req, res) => {
  const { id } = req.params;
  const { category } = req.body;
  try {
    const novelExist = await Novel.findById(id);
    if (!novelExist) {
      return error409(res, "Novel not found");
    }

    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category don't exist");
      }
      if (existCategory.type !== "Novels") {
        return error400(res, "Category type don't belong to novel");
      }
    }

    if (req.file) {
      if (novelExist.thumbnail && novelExist.thumbnail.publicId) {
        await cloudinary.uploader.destroy(novelExist.thumbnail.publicId, {
          resource_type: "image",
          folder: "novel",
        });
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        folder: "novel",
      });
      const updatedNovel = await Novel.findByIdAndUpdate(
        id,
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
      return success(res, "200", "Success", updatedNovel);
    } else {
      const updatedNovel = await Novel.findByIdAndUpdate(
        id,
        {
          ...req.body,
        },
        {
          new: true,
        }
      );
      return success(res, "200", "Success", updatedNovel);
    }
  } catch (err) {
    error500(res, err);
  }
};

// Delete Novel
const deleteNovel = async (req, res) => {
  const { id } = req.params;
  try {
    const novel = await Novel.findById(id);
    if (!novel) {
      return error404(res, "Novel not found");
    }

    const novelsChapters = await Chapter.find({ novel: id });
    if (novelsChapters.length) {
      for (const chapter of novelsChapters) {
        if (chapter.chapterPdf && chapter.chapterPdf.publicId) {
          await cloudinary.uploader.destroy(chapter.chapterPdf.publicId, {
            resource_type: "image",
            folder: "novel",
          });
        }
        await Chapter.deleteOne(chapter._id);
      }
    }
    if (novel.thumbnail && novel.thumbnail.publicId) {
      await cloudinary.uploader.destroy(novel.thumbnail.publicId, {
        resource_type: "image",
        folder: "novel",
      });
    }
    await Novel.deleteOne({ _id: id });
    return status200(res, "Novel deleted successfully with all chapters");
  } catch (err) {
    return error500(res, err);
  }
};

// Rate the Novel
const rateNovel = async (req, res) => {
  const { id } = req.params;
  try {
    const novel = await Novel.findByIdAndUpdate(
      {
        _id: id,
      },
      {
        $push: {
          reviews: {
            user: req.user._id,
            ...req.body,
          },
        },
      }
    );
    if (!novel) {
      return error404(res, "Novel not found");
    }
    return status200(res, "Novel rated successfully");
  } catch (err) {
    return error500(res, err);
  }
};

// Rate the Novel
const likeCommentOnNovel = async (req, res) => {
  const { novelId, reviewId } = req.body;
  try {
    const novel = await Novel.findById({
      _id: novelId,
    });
    if (!novel) {
      return error404(res, "Novel not found");
    }

    const review = novel.reviews.id(reviewId);
    if (!review) {
      return error404(res, "Review not found");
    }

    const userIndex = review.likes.indexOf(req.user._id);
    let update;
    let responseMsg;
    if (userIndex === -1) {
      update = {
        $push: { "reviews.$.likes": req.user._id },
        $inc: { "reviews.$.totalLikes": 1 },
      };
      responseMsg = "Like comment successfully";
    } else {
      update = {
        $pull: { "reviews.$.likes": req.user._id },
        $inc: { "reviews.$.totalLikes": -1 },
      };
      responseMsg = "Unlike comment successfully";
    }
    await Novel.updateOne(
      {
        _id: novelId,
        "reviews._id": reviewId,
      },
      update
    );
    return status200(res, responseMsg);
  } catch (err) {
    return error500(res, err);
  }
};

// Top rated novels
const getTopRatedNovels = async (req, res) => {
  const { categoryId } = req.query;
  const { latest } = req.body;

  const sortOptions = {
    totalRating: -1,
  };

  if (latest) {
    sortOptions.createdAt = -1;
  }

  try {
    const topRatedNovelsPipelines = [
      { $unwind: "$reviews" },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          category: { $first: "$category" },
          type: { $first: "$type" },
          // author: { $first: "$author" },
          chapters: { $first: "$chapters" },
          thumbnail: { $first: { publicUrl: "$thumbnail.publicUrl" } },
          totalRating: { $avg: "$reviews.rating" },
        },
      },
      { $sort: sortOptions },
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
      topRankedNovels: populatedNovels,
    };
    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

//All reviews of novel
const allReviewsOfNovels = async (req, res) => {
  const { dateFilter } = req.query;
  const { id } = req.params;

  let startDate;
  const currentDate = new Date();

  try {
    if (dateFilter) {
      switch (dateFilter) {
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
          return res.status(400).json({ message: "Invalid date filter" });
      }
    }

    const query = startDate
      ? { $gte: startDate, $lte: endDate }
      : {
          $lte: new Date(),
        };
    const novels = await Novel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $unwind: "$reviews",
      },
      {
        $match: {
          "reviews.createdAt": query,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "reviews.user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $project: {
          _id: 1,
          title: 1,
          "reviews.rating": 1,
          "reviews.comment": 1,
          "reviews.totalLikes": 1,
          "reviews.createdAt": 1,
          "userDetails.userName": 1,
          "userDetails.profileImage.publicUrl": 1,
        },
      },
    ]);

    return success(res, "200", "Success", novels);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addNovel,
  addNovelToDraft,
  getAllNovels,
  editNovel,
  deleteNovel,
  getAuthorNovels,
  rateNovel,
  likeCommentOnNovel,
  getTopRatedNovels,
  allReviewsOfNovels,
};
