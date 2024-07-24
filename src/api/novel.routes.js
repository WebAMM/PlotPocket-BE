const router = require("express").Router();
//controllers
const novelController = require("../controllers/novel.controller");
const chapterController = require("../controllers/chapter.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Publish the novel
router.post(
  "/admin/publish",
  verifyToken,
  verifyRole(["Admin"]),
  upload.single("thumbnail"),
  payloadValidator.validateAddNovel,
  novelController.addNovel
);

//[ADMIN] Add novels in draft
router.post(
  "/admin/draft",
  verifyToken,
  verifyRole(["Admin"]),
  upload.single("thumbnail"),
  novelController.addNovelToDraft
);

//[ADMIN] Edit novel
router.put(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  upload.single("thumbnail"),
  novelController.editNovel
);

//[ADMIN] Delete novel
router.delete(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  novelController.deleteNovel
);

//[ADMIN] Get novels
router.get(
  "/admin/all",
  verifyToken,
  verifyRole(["Admin"]),
  novelController.getAllNovels
);

//[ADMIN] Get chapters of novels
router.get(
  "/app/all-chapters/:id",
  verifyToken,
  novelController.getAllChaptersOfNovel
);

//[ADMIN] Get novels of author
router.get(
  "/admin/author-novels/:id",
  verifyToken,
  verifyRole(["Admin"]),
  novelController.getAuthorNovels
);

//[APP] Rate the novel
router.post(
  "/app/rate/:id",
  verifyToken,
  payloadValidator.validateRateNovel,
  novelController.rateNovel
);

//[APP] Like the user comment on novel
router.post("/app/like", verifyToken, novelController.likeCommentOnNovel);

//[ADMIN] Get all reviews of novels
router.get(
  "/admin/all-reviews/:id",
  verifyToken,
  verifyRole(["Admin"]),
  novelController.allReviewsOfNovels
);

//[ADMIN] Get all views of novels
router.get(
  "/admin/all-views/:id",
  verifyToken,
  verifyRole(["Admin"]),
  novelController.allViewsOfNovels
);

//Detailed pages of Dashboard
//[APP] Get all best novels
router.get("/app/best", verifyToken, novelController.bestNovels);

//[APP] Get all top novels
router.get("/app/top", verifyToken, novelController.topNovels);

//[APP] Get all top ranked novels
router.get("/app/top-ranked", verifyToken, novelController.getTopRatedNovels);

module.exports = router;
