//Models
const Novel = require("../models/Novel.model");
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

//Add Novel
const addNovel = async (req, res) => {
  try {
    const { title } = req.body;
    const existNovel = await Novel.findOne({ title });
    if (existNovel) {
      return error409(res, "Novel Already Exists");
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
      });
      return status200(res, "Novel created successfully");
    } else {
      return error400(res, "Thumbnail is required");
    }
  } catch (err) {
    error500(res, err);
  }
};

// Get All Novels
const getAllNovels = async (req, res) => {
  try {
    const novels = await Novel.find()
      .select(
        "_id thumbnail.publicUrl title description publishDate views visibility language rating"
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

    const allNovels = novels.map((novel) => ({
      _id: novel._id,
      thumbnail: novel.thumbnail,
      title: novel.title,
      description: novel.description,
      publishDate: novel.publishDate,
      views: novel.views,
      visibility: novel.visibility,
      language: novel.language,
      totalChapters: novel.chapters.length,
      category: novel.category,
      author: novel.author,
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
    const novels = await Novel.find()
      .select(
        "_id thumbnail.publicUrl title description publishDate views visibility language reviews"
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

    const allNovels = novels.map((novel) => ({
      _id: novel._id,
      thumbnail: novel.thumbnail,
      title: novel.title,
      description: novel.description,
      publishDate: novel.publishDate,
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
  try {
    const updatedNovel = await Novel.findOneAndUpdate(
      { _id: id },
      { $set: req.body },
      { new: true }
    );
    if (!updatedNovel) {
      return error404(res, "Novel not found");
    }
    success(res, "200", "Novel updated successfully", updatedNovel);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Novel
const deleteNovel = async (req, res) => {
  const { id } = req.params;
  try {
    const novel = await Novel.findByIdAndDelete(id);
    if (!novel) {
      return error404(res, "Novel not found");
    }
    return status200(res, "Novel deleted successfully");
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
  try {
    const topRatedNovelsPipelines = [
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
      options: { sort: { createdAt: 1 } },
      select: "chapterPdf.publicUrl name chapterNo content views",
    });

    return success(res, "200", "Success", populatedNovels);
  } catch (err) {
    return error500(res, err);
  }
};

// Single novel detail with comments.
const singleNovel = async (req, res) => {
  const { id } = req.params;
  try {
    const singleNovel = await Novel.findById(id)
      .select("thumbnail.publicUrl title type language")
      .populate([
        {
          path: "author",
          select: "authorPic.publicUrl name gender followers",
        },
        {
          path: "category",
          select: "title",
        },
        {
          path: "chapters",  
          select:
            "chapterPdf.publicUrl chapterNo content views publishedDate createdAt",
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

    singleNovel.author.followers = singleNovel.author.followers.length || 0;

    if (singleNovel.reviews?.length) {
      singleNovel.reviews = singleNovel.reviews.map((review) => ({
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

    return success(res, "200", "Success", singleNovel);
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addNovel,
  getAllNovels,
  editNovel,
  deleteNovel,
  getAuthorNovels,
  rateNovel,
  likeCommentOnNovel,
  getTopRatedNovels,
  singleNovel,
};
