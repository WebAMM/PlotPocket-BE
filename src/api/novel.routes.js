const router = require("express").Router();
//controllers
const novelController = require("../controllers/novel.controller");
const chapterController = require("../controllers/chapter.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//Publish the novel
router.post(
  "/admin/publish",
  verifyToken,
  upload.single("thumbnail"),
  payloadValidator.validateAddNovel,
  novelController.addNovel
);

//Add novels in draft
router.post(
  "/admin/draft",
  verifyToken,
  upload.single("thumbnail"),
  novelController.addNovelToDraft
);

//Edit novel
router.put(
  "/admin/:id",
  verifyToken,
  upload.single("thumbnail"),
  novelController.editNovel
);

//Delete novel
router.delete("/admin/:id", verifyToken, novelController.deleteNovel);

//Get novels
router.get("/admin/all", verifyToken, novelController.getAllNovels);

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

//Get all views of novels
router.get(
  "/admin/all-views/:id",
  verifyToken,
  novelController.allViewsOfNovels
);

module.exports = router;
