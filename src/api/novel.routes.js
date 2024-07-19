const router = require("express").Router();
//controllers
const novelController = require("../controllers/novel.controller");
const chapterController = require("../controllers/chapter.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//Add novel
router.post(
  "/admin/add",
  verifyToken,
  upload.single("thumbnail"),
  payloadValidator.validateAddNovel,
  novelController.addNovel
);

//Add chapters to novel
router.post(
  "/admin/add-chapter/:id",
  verifyToken,
  upload.single("chapter"),
  payloadValidator.validateAddChapter,
  chapterController.addChapter
);

//Edit novel
router.put("/admin/edit/:id", verifyToken, novelController.editNovel);

//Delete novel
router.delete("/admin/:id", verifyToken, novelController.deleteNovel);

//Get novels
router.get("/admin/all", verifyToken, novelController.getAllNovels);

//Get chapters based on novel
router.get(
  "/admin/get-chapters",
  verifyToken,
  chapterController.getAllChaptersByNovel
);

//Get novels of author
router.get(
  "/admin/author-novels/:id",
  verifyToken,
  novelController.getAuthorNovels
);

//Rate the novel
router.post(
  "/app/rate/:id",
  verifyToken,
  payloadValidator.validateRateNovel,
  novelController.rateNovel
);

//Like the user comment on novel
router.post("/app/like", verifyToken, novelController.likeCommentOnNovel);

//Get all top ranked novels
router.get("/app/top-ranked", verifyToken, novelController.getTopRatedNovels);

//Get all reviews of novels
router.get(
  "/admin/all-reviews/:id",
  verifyToken,
  novelController.allReviewsOfNovels
);

module.exports = router;
