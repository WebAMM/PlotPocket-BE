const router = require("express").Router();
//controllers
const seriesController = require("../controllers/series.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//Add series
router.post(
  "/admin/add",
  verifyToken,
  upload.single("thumbnail"),
  payloadValidator.validateAddSeries,
  seriesController.addSeries
);

//Get series
router.get("/admin/all", verifyToken, seriesController.getAllSeries);

//Delete series
router.get("/admin/:id", verifyToken, seriesController.deleteSeries);

//Get all top rated series
router.get("/app/top-rated", verifyToken, seriesController.getTopRatedSeries);

module.exports = router;
