const AWS = require("aws-sdk");

const awsConfig = {
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION,
};

const s3 = new AWS.S3(awsConfig);

const uploadFileToS3 = (params) => {
  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(new Error("Failed to upload"));
      } else {
        resolve(data);
      }
    });
  });
};

const deleteFileFromBucket = (params) => {
  return new Promise((resolve, reject) => {
    s3.deleteObject(params, (err, data) => {
      if (err) {
        reject(new Error("Failed to delete"));
      } else {
        resolve(data);
      }
    });
  });
};

module.exports = { uploadFileToS3, deleteFileFromBucket };
