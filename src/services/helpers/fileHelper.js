const multer = require("multer");
const path = require("path");

const upload = multer({
  storage: multer.diskStorage({}),
  // limits: { fileSize: 100 * 1024 * 1024 }, //100mb
  // limits: { fieldSize: 52428800 }, //100mb
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (
      ext !== ".jpg" &&
      ext !== ".jpeg" &&
      ext !== ".png" &&
      ext !== ".gif" &&
      ext !== ".pdf" &&
      ext !== ".mp4"
    ) {
      cb(new Error("File type is not supported"), false);
      return;
    }
    cb(null, true);
  },
});

const storage = multer.memoryStorage();
const uploadStream = multer({
  storage,
});

module.exports = { upload, uploadStream };
