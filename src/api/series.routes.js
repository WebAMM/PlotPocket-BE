const router = require("express").Router();
//controllers
const {
  addSeries,
  getAllSeries,
  editSeries,
  deleteSeries,
} = require("../controllers/series.controller");
//controllers
const { addEpisode } = require("../controllers/episode.controller");
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
  addSeries
);

//Get series
router.get("/admin/all", verifyToken, getAllSeries);

//Delete series
router.get("/admin/admin/:id", verifyToken, deleteSeries);

//Add episodes in series
router.post(
  "/admin/add-episode/:id",
  verifyToken,
  upload.single("episode"),
  payloadValidator.validateAddEpisode,
  addEpisode
);

module.exports = router;
