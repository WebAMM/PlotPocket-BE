const router = require("express").Router();
//controllers
const episodeController = require("../controllers/episode.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//Add episodes in series
router.post(
  "/admin/add/:id",
  verifyToken,
  upload.single("episode"),
  payloadValidator.validateAddEpisode,
  episodeController.addEpisode
);

//Rate the episode on episode view screen
router.post("/app/rate/:id", verifyToken, episodeController.rateTheEpisode);

//Series episodes
router.get(
  "/admin/series-episodes/:id",
  verifyToken,
  episodeController.episodesOfSeries
);

//All episode of series (id represents series id), this API will increase the view of Series alway which episode is first showed
router.get("/app/all/:id", verifyToken, episodeController.allEpisodeOfSeries);

//Delete episode based on series
router.delete("/admin/:id", verifyToken, episodeController.deleteEpisode);

module.exports = router;
