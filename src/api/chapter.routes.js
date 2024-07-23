const router = require("express").Router();
//controllers
const chapterController = require("../controllers/chapter.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Add chapters to novel
router.post(
  "/admin/add-chapter/:id",
  verifyToken,
  upload.single("chapter"),
  payloadValidator.validateAddChapter,
  chapterController.addChapter
);

//[ADMIN] Get chapters based on novel
router.get(
  "/admin/novel-chapters/:id",
  verifyToken,
  chapterController.getAllChaptersByNovel
);

//[ADMIN] Delete chapters based on novel
router.delete("/admin/:id", verifyToken, chapterController.deleteChapter);

//[ADMIN] Edit chapter
router.put(
  "/admin/:id",
  verifyToken,
  upload.single("chapter"),
  chapterController.updateChapter
);

module.exports = router;
