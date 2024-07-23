const router = require("express").Router();
//controllers
const searchHistory = require("../controllers/searchHistory.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//[APP] All search history of user
router.get("/app/all", verifyToken, searchHistory.getAllSearchHistory);

//[APP] Remove search history of user
router.delete(
  "/app/remove/:id",
  verifyToken,
  searchHistory.removeSearchHistory
);

module.exports = router;
