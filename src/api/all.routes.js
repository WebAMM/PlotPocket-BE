const router = require("express").Router();
//controllers
const allController = require("../controllers/all.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//[APP] Increase View
router.post("/app/view", verifyToken, allController.increaseView);

//[APP] Search All Novels + Series
router.get("/app/search", verifyToken, allController.globalSearch);

//[APP] All top ranked
router.get("/app/top-ranked", verifyToken, allController.topRanked);

//Series + Novels
//[APP] Single Novel/Series detail
router.get("/app/single/:id", verifyToken, allController.singleDetailPage);

//[APP] Featured Series + Novels
router.get("/app/featured", verifyToken, allController.featuredSeriesNovels);

//[APP] Featured Series + Novels
router.get("/app/latest", verifyToken, allController.latestSeriesNovels);

//[APP] Top ranked Series + Novels
router.get("/app/ranked", verifyToken, allController.topRanked);

module.exports = router;
