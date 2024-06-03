const cloudinary = require("cloudinary");
const config = require("../../config");

cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
});

module.exports = cloudinary;