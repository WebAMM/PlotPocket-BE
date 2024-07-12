const router = require("express").Router();
//controllers
const mightLikeController = require("../controllers/mightLike.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//Get all categories
router.get("/app/all", verifyToken, mightLikeController.mightLike);

module.exports = router;
