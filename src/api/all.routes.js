const router = require("express").Router();
//controllers
const allController = require("../controllers/all.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//[APP] Increase View
router.post(
  "/app/view",
  verifyToken,
  payloadValidator.validateIncreaseView,
  allController.increaseView
);

//[APP] Search All Novels + Series
router.get("/app/search", verifyToken, allController.globalSearch);

//Series + Novels
//[APP] Single Novel/Series detail
router.get("/app/single/:id", verifyToken, allController.singleDetailPage);

//For Dashboard Detail Flows
// //[APP] Featured Series + Novels
// router.get("/app/featured", verifyToken, allController.featuredSeriesNovels);

// //[APP] Latest Series + Novels
// router.get("/app/latest", verifyToken, allController.latestSeriesNovels);

// //[APP] Top ranked Series + Novels
// router.get("/app/top-ranked", verifyToken, allController.topRankedSeriesNovel);

//[APP] Featured + Latest + Top Ranked
router.get(
  "/app/combinedSeriesNovels",
  verifyToken,
  allController.combinedSeriesNovels
);

module.exports = router;
