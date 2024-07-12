//Model
const Author = require("../models/Author.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
//helpers and functions
const cloudinary = require("../services/helpers/cloudinary").v2;

//Add author
const addAuthor = async (req, res) => {
  const { name, gender } = req.body;
  try {
    const exists = await Author.findOne({ name });
    if (exists) {
      return error409(res, `Author ${name} exists`);
    }
    const authorData = {
      name,
      gender,
    };
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        folder: "author",
      });
      authorData.authorPic = {
        publicUrl: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format,
      };
    }
    await Author.create(authorData);
    return status200(res, "Author created successfully");
  } catch (err) {
    return error500(res, err);
  }
};

//All Authors
const getAllAuthors = async (req, res) => {
  try {
    const authors = await Author.find().select(
      "authorPic.publicUrl _id name gender createdAt"
    );
    success(res, "200", "Success", authors);
  } catch (err) {
    error500(res, err);
  }
};

//Follow author
const followAuthor = async (req, res) => {
  const { id } = req.params;
  try {
    const author = await Author.findById(id);

    if (!author) {
      return error404(res, "Author not found");
    }

    const isFollowing = author.followers.includes(req.user._id);

    if (isFollowing) {
      await Author.findByIdAndUpdate(
        id,
        {
          $pull: {
            followers: req.user._id,
          },
        },
        {
          new: true,
        }
      );
      return status200(res, "Successfully unfollowed the author");
    } else {
      await Author.findByIdAndUpdate(
        id,
        {
          $addToSet: {
            followers: req.user._id,
          },
        },
        { new: true }
      );

      return status200(res, "Successfully followed the author");
    }
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  addAuthor,
  getAllAuthors,
  followAuthor,
};
