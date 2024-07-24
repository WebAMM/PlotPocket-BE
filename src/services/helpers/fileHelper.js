const multer = require("multer");
const path = require("path");

const upload = multer({
  storage: multer.diskStorage({}),
  limits: {
    fileSize: 100 * 1024 * 1024, //100 MB
  },
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname);
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
      cb(new Error("File type is not supported"), false);
      return;
    }
    cb(null, true);
  },
});

module.exports = { upload };
