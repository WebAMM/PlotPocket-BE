const router = require("express").Router();
//myListController
const myListController = require("../controllers/myList.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");

//[APP] Add series to my list
router.post(
  "/app/add/:id",
  verifyToken,
  verifyRole(["User", "Guest"]),
  myListController.addEpisodeToList
);

//[APP] All lists/bookmarks of user
router.get(
  "/app/all",
  verifyToken,
  verifyRole(["User", "Guest"]),
  myListController.allMyLists
);

module.exports = router;
