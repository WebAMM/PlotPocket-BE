const router = require("express").Router();
//myListController
const myListController = require("../controllers/myList.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");

//[APP] Add series to my list
router.post("/app/add/:id", verifyToken, myListController.addEpisodeToList);

//[APP] All lists/bookmarks of user
router.get("/app/all", verifyToken, myListController.allMyLists);

module.exports = router;
