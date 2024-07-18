const router = require("express").Router();
//controllers
const allController = require("../controllers/all.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//Search All Novels + Series
router.get("/app/search", verifyToken, allController.globalSearch);

//All top ranked
router.get("/app/top-ranked", verifyToken, allController.topRanked);

//Single Novel/Series detail
router.get("/app/single/:id", verifyToken, allController.singleDetailPage);

module.exports = router;
