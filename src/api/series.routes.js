const router = require("express").Router();
//controllers
const {
  addSeries,
  getAllSeries,
  editSeries,
  deleteSeries,
} = require("../controllers/series.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");

//Add series
router.post("/admin/add", verifyToken, upload.single("thumbnail"), addSeries);

//Get series
router.get("/admin/all", verifyToken, getAllSeries);

//Delete series
router.get("/admin/admin/:id", verifyToken, deleteSeries);

module.exports = router;
