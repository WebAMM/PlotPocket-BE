//Model
const Author = require("../models/Author.model");
//Responses and errors
const { error500, error404, error400 } = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
//helpers and functions
const fs = require("fs");
const extractFormat = require("../services/helpers/extractFormat");
const { uploadFileToS3 } = require("../services/helpers/awsConfig");

//Add author
const addAuthor = async (req, res) => {
  const { name, gender } = req.body;
  try {
    // const exists = await Author.findOne({ name });
    // if (exists) {
    //   return error409(res, `Author ${name} already exist`);
    // }
    const authorData = {
      name,
      gender,
    };

    if (req.file) {
      const file = req.file;
      const fileFormat = extractFormat(file.mimetype);

      //Upload file to S3
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `author/${Date.now()}_${file.originalname}`,
        Body: fs.createReadStream(req.file.path),
        ContentType: fileFormat,
      };

      const uploadResult = await uploadFileToS3(params);

      authorData.authorPic = {
        publicUrl: uploadResult.Location,
        publicId: uploadResult.Key,
        format: fileFormat,
      };
      await Author.create(authorData);
      return status200(res, "Author created successfully");
    } else {
      return error400(res, "Author picture is required");
    }
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
      await Author.findByIdAndUpdate(id, {
        $pull: {
          followers: req.user._id,
        },
      });
      return status200(res, "Successfully unfollowed the author");
    } else {
      await Author.findByIdAndUpdate(id, {
        $addToSet: {
          followers: req.user._id,
        },
      });

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
