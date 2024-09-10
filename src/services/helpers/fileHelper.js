const multer = require("multer");
const path = require("path");

const upload = multer({
  storage: multer.memoryStorage(),
  // limits: { fileSize: 100  1024  1024 }, //100mb
  limits: { fieldSize: 52428800 }, //100mb
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (
      ext !== ".jpg" &&
      ext !== ".jpeg" &&
      ext !== ".png" &&
      ext !== ".gif" &&
      ext !== ".pdf" &&
      ext !== ".doc" &&
      ext !== ".docx" &&
      ext !== ".mp4"
    ) {
      const error = new Error("File type is not supported");
      error.code = "UNSUPPORTED_FILE_TYPE";
      return cb(error, false);
    }
    cb(null, true);
  },
});

module.exports = { upload };
