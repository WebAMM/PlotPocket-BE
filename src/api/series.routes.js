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



//[ADMIN] Get series views
router.get(
  "/admin/all-views/:id",
  verifyToken,
  verifyRole(["Admin"]),
  seriesController.allViewsOfSeries
);

//[APP] Get all best series
router.get("/app/best", verifyToken, seriesController.bestSeries);

//[APP] Get all top series
router.get("/app/top-rated", verifyToken, seriesController.topSeries);

//[APP] Get all top rated series
router.get("/app/top-rated", verifyToken, seriesController.getTopRatedSeries);

module.exports = router;
