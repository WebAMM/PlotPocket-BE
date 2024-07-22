const router = require("express").Router();
//controllers
const seriesController = require("../controllers/series.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//Publish the series
router.post(
  "/admin/publish",
  verifyToken,
  upload.single("thumbnail"),
  payloadValidator.validateAddSeries,
  seriesController.addSeries
);

//Add series in draft
router.post(
  "/admin/draft",
  verifyToken,
  upload.single("thumbnail"),
  seriesController.addSeriesToDraft
);

//Edit series
router.put(
  "/admin/:id",
  verifyToken,
  upload.single("thumbnail"),
  // payloadValidator.validateAddSeries,
  seriesController.editSeries
);

//Get series
router.get("/admin/all", verifyToken, seriesController.getAllSeries);

//Delete series
router.delete("/admin/:id", verifyToken, seriesController.deleteSeries);

//Get all top rated series
router.get("/app/top-rated", verifyToken, seriesController.getTopRatedSeries);

module.exports = router;
