//Models
const Novel = require("../models/Novel.model");
const Chapter = require("../models/Chapter.model");
const Category = require("../models/Category.model");
const Author = require("../models/Author.model");
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
        "_id thumbnail.publicUrl title description createdAt totalViews visibility language reviews status adult totalViews"
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
      visibility: novel.visibility,
      language: novel.language,
      totalChapters: novel.chapters.length,
      category: novel.category,
      author: novel.author,
      status: novel.status,
      reviews: novel.reviews.length || 0,
      adult: novel.adult || false,
      totalViews: novel.totalViews || 0,
    }));

    success(res, "200", "Success", allNovels);
  } catch (err) {
    error500(res, err);
  }
};

// Get All Chapters by Novel
const getAllChaptersOfNovel = async (req, res) => {
  const { id } = req.params;
  const { page = 1, pageSize = 10 } = req.query;
  try {
    const novelExist = await Novel.findById(id);
    if (!novelExist) {
      return error404(res, "Novel not found");
    }

    // Pagination calculations
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalChaptersCount = await Chapter.countDocuments({ novel: id });
    const skip = (currentPage - 1) * size;
    const limit = size;

    const chapters = await Chapter.find({
      novel: id,
    })
      .select(
        "chapterPdf.publicUrl totalViews createdAt content name chapterNo description"
      )
      .populate({
        path: "novel",
        select: "thumbnail.publicUrl",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    //To handle infinite scroll on frontend
    const hasMore = skip + limit < totalChaptersCount;

    const data = {
      chapters,
      hasMore,
    };

    success(res, "200", "Success", data);
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
        "_id thumbnail.publicUrl title description createdAt visibility language reviews status adult totalViews"
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
      visibility: novel.visibility,
      language: novel.language,
      totalChapters: novel.chapters.length,
      category: novel.category,
      author: novel.author,
      status: novel.status,
      reviews: novel.reviews.length || 0,
      adult: novel.adult || false,
      totalViews: novel.totalViews || 0,
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
  const { rating, comment } = req.body;
  try {
    const novel = await Novel.findById(id);
    if (!novel) {
      return error404(res, "Novel not found");
    }
    //Check user already rated
    const existingReviewIndex = novel.reviews.findIndex(
      (review) => review.user.toString() === req.user._id
    );

    if (existingReviewIndex !== -1) {
      return error400(res, "Already rated");
    } else {
      novel.reviews.push({ user: req.user._id, rating, comment });
    }
    //Storing novel avg rating
    const totalRating = novel.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    novel.averageRating = totalRating / novel.reviews.length;

    await novel.save();

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

//All reviews of novel
const allReviewsOfNovels = async (req, res) => {
  const { date } = req.query;
  const { id } = req.params;
  let startDate;
  const currentDate = new Date();
  try {
    if (date) {
      switch (date) {
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
          return error404(res, "Invalid date filter");
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

//All views of novels
const allViewsOfNovels = async (req, res) => {
  const { date } = req.query;
  const { id } = req.params;
  let startDate;
  const currentDate = new Date();
  try {
    if (date) {
      switch (date) {
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
          return error404(res, "Invalid date filter");
      }
    }

    const query = startDate
      ? { $gte: startDate, $lte: endDate }
      : { $lte: new Date() };

    const novels = await Novel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $unwind: "$views",
      },
      {
        $match: {
          "views.date": query,
        },
      },
      {
        $project: {
          _id: 0,
          "views.user": 1,
          "views.date": 1,
          "views.view": 1,
          "views._id": 1,
        },
      },
    ]);

    const novelViews = novels.map((elem) => elem.views);
    return success(res, "200", "Success", novelViews);
  } catch (err) {
    return error500(res, err);
  }
};

// Best novels
const bestNovels = async (req, res) => {
  const { category, page = 1, pageSize = 10 } = req.query;

  const query = {
    status: "Published",
    visibility: "Public",
    totalViews: { $gt: 500 },
  };

  try {
    //Filtering based on Category
    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category not found");
      }
      query.category = category;
    }

    // Pagination calculations
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalNovelsCount = await Novel.countDocuments(query);
    const skip = (currentPage - 1) * size;
    const limit = size;

    const bestNovels = await Novel.find(query)
      .select("thumbnail.publicUrl title type averageRating")
      .sort({ totalViews: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews",
        options: { sort: { createdAt: 1 }, limit: 5 },
      });

    //To handle infinite scroll on frontend
    const hasMore = skip + limit < totalNovelsCount;

    const data = {
      bestNovels,
      hasMore,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

// Top novels
const topNovels = async (req, res) => {
  const { category, page = 1, pageSize = 10 } = req.query;

  const currentPage = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 10;

  const query = {
    status: "Published",
    visibility: "Public",
    totalViews: { $gt: 0, $lte: 500 },
  };

  //Filtering based on Category
  try {
    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category not found");
      }
      query.category = category;
    }

    const totalNovelsCount = await Novel.countDocuments(query);

    // Pagination calculations
    const skip = (currentPage - 1) * size;
    const limit = size;

    const topNovels = await Novel.find(query)
      .select("thumbnail.publicUrl title type averageRating")
      .sort({ totalViews: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews",
        options: { sort: { createdAt: 1 }, limit: 5 },
      });

    const hasMore = skip + limit < totalNovelsCount;

    const data = {
      topNovels,
      hasMore,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

// Top rated novels
const getTopRatedNovels = async (req, res) => {
  const { category, latest, day, page = 1, pageSize = 10 } = req.query;

  let query = {
    status: "Published",
    visibility: "Public",
    averageRating: { $gte: 1 },
  };

  //Filtering based on classifications
  let sortOptions = {
    averageRating: -1,
  };

  if (latest) {
    sortOptions.createdAt = -1;
  }

  try {
    //Filtering based on Category
    if (category) {
      const existCategory = await Category.findById(category);
      if (!existCategory) {
        return error409(res, "Category not found");
      }
      query.category = category;
    }

    //For Pagination
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalNovelsCount = await Novel.countDocuments(query);
    const skip = (currentPage - 1) * size;
    const limit = size;

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

    const topRatedNovel = await Novel.find(query)
      .select("thumbnail.publicUrl title view type averageRating")
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
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    //To handle infinite scroll on frontend
    const hasMore = skip + limit < totalNovelsCount;

    const data = {
      topRatedNovel,
      hasMore,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

//All novels by type
const getDetailNovelByType = async (req, res) => {
  const { type, category, latest, day, page = 1, pageSize = 10 } = req.query;
  const validTypes = ["Best", "Top", "TopRanked"];
  if (!validTypes.includes(type)) {
    return error400(
      res,
      "Invalid type parameter. Choose either Best, Top or TopRanked"
    );
  }

  try {
    if (type === "Best") {
      const query = {
        status: "Published",
        visibility: "Public",
        totalViews: { $gt: 500 },
      };

      //Filtering based on Category
      if (category) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error409(res, "Category not found");
        }
        query.category = category;
      }

      // Pagination calculations
      const currentPage = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const totalNovelsCount = await Novel.countDocuments(query);
      const skip = (currentPage - 1) * size;
      const limit = size;

      const bestNovels = await Novel.find(query)
        .select("thumbnail.publicUrl title type averageRating")
        .sort({ totalViews: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "chapters",
          select: "chapterPdf.publicUrl name chapterNo content totalViews",
          options: { sort: { createdAt: 1 }, limit: 5 },
        });

      //To handle infinite scroll on frontend
      const hasMore = skip + limit < totalNovelsCount;
      const data = {
        novels: bestNovels,
        hasMore,
      };
      return success(res, "200", "Success", data);
    } else if (type === "Top") {
      const query = {
        status: "Published",
        visibility: "Public",
        totalViews: { $gt: 0, $lte: 500 },
      };

      if (category) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error409(res, "Category not found");
        }
        query.category = category;
      }

      // Pagination calculations
      const currentPage = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const totalNovelsCount = await Novel.countDocuments(query);
      const skip = (currentPage - 1) * size;
      const limit = size;

      const topNovels = await Novel.find(query)
        .select("thumbnail.publicUrl title type averageRating")
        .sort({ totalViews: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "chapters",
          select: "chapterPdf.publicUrl name chapterNo content totalViews",
          options: { sort: { createdAt: 1 }, limit: 5 },
        });

      const hasMore = skip + limit < totalNovelsCount;

      const data = {
        novels: topNovels,
        hasMore,
      };
      return success(res, "200", "Success", data);
    } else if (type === "TopRanked") {
      let query = {
        status: "Published",
        visibility: "Public",
        averageRating: { $gte: 1 },
      };

      //Filtering based on classifications
      let sortOptions = {
        averageRating: -1,
      };

      if (latest) {
        sortOptions.createdAt = -1;
      }

      //Filtering based on Category
      if (category) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error409(res, "Category not found");
        }
        query.category = category;
      }

      //For Pagination
      const currentPage = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const totalNovelsCount = await Novel.countDocuments(query);
      const skip = (currentPage - 1) * size;
      const limit = size;

      //Filtering based on Day
      if (day) {
        const parsedDay = parseInt(day);
        if (day === "Today") {
          const today = new Date();
          query.createdAt = {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lte: new Date(today.setHours(23, 59, 59, 999)),
          };
        } else if ([7, 14, 30].includes(parsedDay)) {
          const today = new Date();
          const startDate = new Date();
          startDate.setDate(today.getDate() - parsedDay + 1);
          query.createdAt = {
            $gte: new Date(startDate.setHours(0, 0, 0, 0)),
            $lte: new Date(today.setHours(23, 59, 59, 999)),
          };
        } else {
          return error400(
            res,
            "Invalid date parameter. Use 'Today', 7, 14, or 30"
          );
        }
      }

      const topRatedNovel = await Novel.find(query)
        .select("thumbnail.publicUrl title view type averageRating")
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
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

      //To handle infinite scroll on frontend
      const hasMore = skip + limit < totalNovelsCount;

      const data = {
        novels: topRatedNovel,
        hasMore,
      };

      return success(res, "200", "Success", data);
    }
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addNovel,
  addNovelToDraft,
  getAllNovels,
  getAllChaptersOfNovel,
  editNovel,
  deleteNovel,
  getAuthorNovels,
  rateNovel,
  likeCommentOnNovel,
  allReviewsOfNovels,
  allViewsOfNovels,
  bestNovels,
  topNovels,
  getTopRatedNovels,
  getDetailNovelByType,
};
