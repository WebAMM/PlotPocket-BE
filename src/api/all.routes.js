const router = require("express").Router();
//controllers
const allController = require("../controllers/all.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");

//[APP] Featured + Latest + Top Ranked Detail
router.get(
  "/app/all-detail",
  verifyToken,
  verifyRole(["User", "Guest"]),
  allController.combinedSeriesNovels
);

//[APP] Single Novel/Series detail
router.get(
  "/app/single/:id",
  verifyToken,
  verifyRole(["User", "Guest"]),
  allController.singleDetailPage
);

//[APP] Search All Novels + Series
router.get(
  "/app/search",
  verifyToken,
  verifyRole(["User", "Guest"]),
  allController.globalSearch
);

//[APP] Increase View
// router.post(
//   "/app/inc-view",
//   verifyToken,
//   verifyRole(["User", "Guest"]),
//   payloadValidator.validateIncreaseView,
//   allController.increaseView
// );

//For Dashboard Detail Flows
// //[APP] Featured Series + Novels
// router.get("/app/featured", verifyToken, allController.featuredSeriesNovels);

// //[APP] Latest Series + Novels
// router.get("/app/latest", verifyToken, allController.latestSeriesNovels);

// //[APP] Top ranked Series + Novels
// router.get("/app/top-ranked", verifyToken, allController.topRankedSeriesNovel);

module.exports = router;
