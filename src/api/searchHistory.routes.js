const router = require("express").Router();
//controllers
const searchHistory = require("../controllers/searchHistory.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");

//[APP] All search history of user
router.get(
  "/app/all",
  verifyToken,
  verifyRole(["User", "Guest"]),
  searchHistory.getAllSearchHistory
);

//[APP] Remove search history of user
router.delete(
  "/app/remove/:id",
  verifyToken,
  verifyRole(["User", "Guest"]),
  searchHistory.removeSearchHistory
);

module.exports = router;
