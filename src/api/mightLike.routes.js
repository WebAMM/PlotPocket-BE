const router = require("express").Router();
//controllers
const mightLikeController = require("../controllers/mightLike.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");

//[APP] Get all user can might like
router.get("/app/all", verifyToken, mightLikeController.mightLike);

module.exports = router;
