const router = require("express").Router();
//controllers
const seriesController = require("../controllers/series.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Publish the series
router.post(
  "/admin/publish",
  verifyToken,
  verifyRole(["Admin"]),
  upload.single("thumbnail"),
  payloadValidator.validateAddSeries,
  seriesController.addSeries
);

//[ADMIN] Add series in draft
router.post(
  "/admin/draft",
  verifyToken,
  verifyRole(["Admin"]),
  upload.single("thumbnail"),
  seriesController.addSeriesToDraft
);

//[ADMIN] Edit series
router.put(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  upload.single("thumbnail"),
  // payloadValidator.validateAddSeries,
  seriesController.editSeries
);

//[ADMIN] Get series
router.get(
  "/admin/all",
  verifyToken,
  verifyRole(["Admin"]),
  seriesController.getAllSeries
);

//[ADMIN] Delete series
router.delete(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  seriesController.deleteSeries
);

//[APP] Get episodes of series
router.get(
  "/app/all-episodes/:id",
  verifyRole(["User", "Guest"]),
  verifyToken,
  seriesController.getAllEpisodeOfSeries
);

//[ADMIN] Get series views
router.get(
  "/admin/all-views/:id",
  verifyToken,
  verifyRole(["Admin"]),
  seriesController.allViewsOfSeries
);

//Detailed pages of Dashboard
//[APP] Get all best series
router.get(
  "/app/best",
  verifyToken,
  verifyRole(["User", "Guest"]),
  seriesController.bestSeries
);

//[APP] Get all top series
router.get(
  "/app/top",
  verifyToken,
  verifyRole(["User", "Guest"]),
  seriesController.topSeries
);

//[APP] Get all top rated series
router.get(
  "/app/top-rated",
  verifyToken,
  verifyRole(["User", "Guest"]),
  seriesController.getTopRatedSeries
);

//[APP] Get paginationated series by type
router.get(
  "/app/all/by-type",
  verifyToken,
  verifyRole(["User", "Guest"]),
  seriesController.getDetailSeriesByType
);

module.exports = router;
