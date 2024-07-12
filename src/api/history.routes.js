const router = require("express").Router();
//controllers
const historyController = require("../controllers/history.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//All history of logged in user
router.get("/app/all", verifyToken, historyController.allHistory);

module.exports = router;
