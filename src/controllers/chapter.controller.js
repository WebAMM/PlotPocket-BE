//Models
const Chapter = require("../models/Chapter.model");
const Novel = require("../models/Novel.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  error400,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
//helpers and functions
const cloudinary = require("../services/helpers/cloudinary").v2;

//Add Chapter
const addChapter = async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  try {
    const novelExist = await Novel.findOne({
      _id: id,
      status: "Published",
      visibility: "Public",
    });
    if (!novelExist) {
      return error404(res, "Novel not found");
    }
    // const existChapter = await Chapter.findOne({ name });
    // if (existChapter) {
    //   return error409(res, "Chapter Already Exist");
    // }
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "raw",
        folder: "chapter",
      });
      const newChapter = await Chapter.create({
        ...req.body,
        novel: novelExist._id,
        chapterPdf: {
          publicUrl: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
        },
      });
      await Novel.updateOne(
        {
          _id: id,
        },
        { $push: { chapters: newChapter._id } },
        { new: true }
      );
      return status200(res, "Chapter added in novel");
    } else {
      return error400(res, "Chapter pdf is required");
    }
  } catch (err) {
    error500(res, err);
  }
};

// Get All Chapters by Novel
const getAllChaptersByNovel = async (req, res) => {
  const { id } = req.params;
  try {
    const novelExist = await Novel.findById(id);
    if (!novelExist) {
      return error404(res, "Novel not found");
    }
    const chapters = await Chapter.find({
      novel: id,
    })
      .select(
        "chapterPdf.publicUrl chapterPdf.format totalViews content name chapterNo createdAt price"
      )
      .populate({
        path: "novel",
        select: "thumbnail.publicUrl ",
      });
    success(res, "200", "Success", chapters);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Chapter
const deleteChapter = async (req, res) => {
  const { id } = req.params;
  try {
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return error404(res, "Chapter not found");
    }
    const novel = await Novel.findOne({ _id: chapter.novel });
    if (!novel) {
      return error404(res, "Novel against chapter not found");
    }
    await Novel.updateOne(
      {
        _id: chapter.novel,
      },
      {
        $pull: {
          chapters: id,
        },
      }
    );
    if (chapter.chapterPdf && chapter.chapterPdf.publicId) {
      await cloudinary.uploader.destroy(chapter.chapterPdf.publicId, {
        resource_type: "raw",
        folder: "chapter",
      });
    }
    await Chapter.deleteOne({ _id: id });
    return status200(res, "Chapter removed successfully");
  } catch (err) {
    return error500(res, err);
  }
};

// Update Chapter
const updateChapter = async (req, res) => {
  const { id } = req.params;
  try {
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return error404(res, "Chapter not found");
    }
    if (req.file) {
      if (chapter.episodeVideo && chapter.episodeVideo.publicId) {
        await cloudinary.uploader.destroy(episode.episodeVideo.publicId, {
          resource_type: "raw",
          folder: "chapter",
        });
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "raw",
        folder: "chapter",
      });
      await Chapter.updateOne(
        {
          _id: id,
        },
        {
          ...req.body,
          thumbnail: {
            publicUrl: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format,
          },
        }
      );
      return status200(res, "Chapter updated successfully");
    } else {
      await Chapter.updateOne(
        {
          _id: id,
        },
        {
          ...req.body,
        }
      );
      return status200(res, "Chapter updated successfully");
    }
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addChapter,
  getAllChaptersByNovel,
  deleteChapter,
  updateChapter,
};
