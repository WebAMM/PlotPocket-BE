//Models
const Novel = require("../models/Novel.model");
const Chapter = require("../models/Chapter.model");
const Category = require("../models/Category.model");
const Author = require("../models/Author.model");
const UserPurchases = require("../models/UserPurchases.model");
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
const mongoose = require("mongoose");
const {
  uploadFileToS3,
  deleteFileFromBucket,
} = require("../services/helpers/awsConfig");
const extractFormat = require("../services/helpers/extractFormat");
const fs = require("fs");

//Publish the novel
const addNovel = async (req, res) => {
  try {
    const { title, category, author, draftId } = req.body;
    if (draftId) {
      const draftNovel = await Novel.findOne({
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
        return status200(res, "Novel published successfully");
      } else if (req.file) {
        const file = req.file;
        const fileFormat = extractFormat(file.mimetype);

        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: `novel/${Date.now()}_${file.originalname}`,
          Body: fs.createReadStream(req.file.path),
          ContentType: fileFormat,
        };

        //Upload file to S3
        const uploadResult = await uploadFileToS3(params);

        await Novel.updateOne(
          {
            _id: draftId,
          },
          {
            ...req.body,
            thumbnail: {
              publicUrl: uploadResult.Location,
              publicId: uploadResult.Key,
              format: fileFormat,
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
        const file = req.file;
        const fileFormat = extractFormat(file.mimetype);

        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: `novel/${Date.now()}_${file.originalname}`,
          Body: fs.createReadStream(req.file.path),
          ContentType: fileFormat,
        };

        //Upload file to S3
        const uploadResult = await uploadFileToS3(params);

        await Novel.create({
          ...req.body,
          status: "Published",
          thumbnail: {
            publicUrl: uploadResult.Location,
            publicId: uploadResult.Key,
            format: fileFormat,
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
      const file = req.file;
      const fileFormat = extractFormat(file.mimetype);

      //Upload file to S3
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `novel/${Date.now()}_${file.originalname}`,
        Body: fs.createReadStream(req.file.path),
        contentType: fileFormat,
      };

      const uploadResult = await uploadFileToS3(params);

      await Novel.create({
        ...req.body,
        thumbnail: {
          publicUrl: uploadResult.Location,
          publicId: uploadResult.Key,
          format: fileFormat,
        },
        status: "Draft",
      });
    } else {
      await Novel.create({
        ...req.body,
        thumbnail: {
          publicUrl: "",
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

    const allNovelChapters = await Chapter.find({
      novel: id,
    })
      .select(
        "chapterPdf.publicUrl totalViews createdAt content name chapterNo description coins"
      )
      .populate({
        path: "novel",
        select: "thumbnail.publicUrl",
      })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    //Fetch user purchases
    const userPurchases = await UserPurchases.findOne(
      {
        user: req.user._id,
      },
      {
        chapters: 1,
        _id: 0,
      }
    ).lean();

    const purchasedChapterIds = new Set(
      userPurchases ? userPurchases.chapters.map((e) => e.toString()) : []
    );

    let firstPaidChapter = false;

    const chapters = allNovelChapters.map((chapter) => {
      const isPurchased = purchasedChapterIds.has(chapter._id.toString());

      contentStatus = chapter.content;

      if (chapter.content === "Paid" && isPurchased) {
        contentStatus = "Free";
      }

      //Set canUnlock flag for the paid chapter
      let canUnlock = false;
      if (!firstPaidChapter && contentStatus === "Paid") {
        firstPaidChapter = true;
        canUnlock = true;
      }

      return {
        ...chapter._doc,
        content: contentStatus,
        canUnlock,
      };
    });

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
        const deleteParams = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: novelExist.thumbnail.publicId,
        };
        await deleteFileFromBucket(deleteParams);
      }

      const file = req.file;
      const fileFormat = extractFormat(file.mimetype);

      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `novel/${Date.now()}_${file.originalname}`,
        Body: fs.createReadStream(req.file.path),
        ContentType: fileFormat,
      };

      const uploadResult = await uploadFileToS3(uploadParams);

      const updatedNovel = await Novel.findByIdAndUpdate(
        id,
        {
          ...req.body,
          thumbnail: {
            publicUrl: uploadResult.Location,
            publicId: uploadResult.Key,
            format: fileFormat,
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
          const deleteParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: chapter.chapterPdf.publicId,
          };
          await deleteFileFromBucket(deleteParams);
        }
        await Chapter.deleteOne(chapter._id);
      }
    }
    if (novel.thumbnail && novel.thumbnail.publicId) {
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: novel.thumbnail.publicId,
      };
      await deleteFileFromBucket(deleteParams);
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
    const novel = await Novel.findById(novelId);
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
        select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
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
        select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
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

    //For Pagination
    const currentPage = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    const totalNovelsCount = await Novel.countDocuments(query);
    const skip = (currentPage - 1) * size;
    const limit = size;

    //Filtering based on Day
    if (day && day !== "null" && day !== "undefined" && day !== "false") {
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
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
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
      });

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
  const { type, category, day, page = 1, pageSize = 10 } = req.query;
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

      // Pagination calculations
      const currentPage = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const totalNovelsCount = await Novel.countDocuments(query);
      const skip = (currentPage - 1) * size;
      const limit = size;

      let bestNovels = await Novel.find(query)
        .select("thumbnail.publicUrl title type averageRating createdAt")
        .sort({ totalViews: -1 })
        .skip(skip)
        .limit(limit)
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
        .lean();

      bestNovels = bestNovels.map((item) => ({
        ...item,
        chapters:
          item.chapters && item.chapters.length > 0 ? item.chapters[0] : {},
      }));

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

      // Pagination calculations
      const currentPage = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const totalNovelsCount = await Novel.countDocuments(query);
      const skip = (currentPage - 1) * size;
      const limit = size;

      let topNovels = await Novel.find(query)
        .select("thumbnail.publicUrl title type averageRating createdAt")
        .sort({ totalViews: -1 })
        .skip(skip)
        .limit(limit)
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
        .lean();

      topNovels = topNovels.map((item) => ({
        ...item,
        chapters:
          item.chapters && item.chapters.length > 0 ? item.chapters[0] : {},
      }));

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

      // if (latest) {
      //   sortOptions.createdAt = -1;
      // }

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

      //For Pagination
      const currentPage = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const totalNovelsCount = await Novel.countDocuments(query);
      const skip = (currentPage - 1) * size;
      const limit = size;

      //Filtering based on Day
      if (day && day !== "null" && day !== "undefined" && day !== "false") {
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

      let topRatedNovel = await Novel.find(query)
        .select("thumbnail.publicUrl title view type averageRating createdAt")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
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
        .lean();

      topRatedNovel = topRatedNovel.map((item) => ({
        ...item,
        chapters:
          item.chapters && item.chapters.length > 0 ? item.chapters[0] : {},
      }));

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
