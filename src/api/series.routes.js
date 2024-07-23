const router = require("express").Router();
//controllers
const seriesController = require("../controllers/series.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Publish the series
router.post(
  "/admin/publish",
  verifyToken,
  upload.single("thumbnail"),
  payloadValidator.validateAddSeries,
  seriesController.addSeries
);

//[ADMIN] Add series in draft
router.post(
  "/admin/draft",
  verifyToken,
  upload.single("thumbnail"),
  seriesController.addSeriesToDraft
);

//[ADMIN] Edit series
router.put(
  "/admin/:id",
  verifyToken,
  upload.single("thumbnail"),
  // payloadValidator.validateAddSeries,
  seriesController.editSeries
);

//[ADMIN] Get series
router.get("/admin/all", verifyToken, seriesController.getAllSeries);

//[ADMIN] Delete series
router.delete("/admin/:id", verifyToken, seriesController.deleteSeries);

//[APP] Get all top rated series
router.get("/app/top-rated", verifyToken, seriesController.getTopRatedSeries);

//[ADMIN] Get series views
router.get(
  "/admin/all-views/:id",
  verifyToken,
  seriesController.allViewsOfSeries
);

module.exports = router;
