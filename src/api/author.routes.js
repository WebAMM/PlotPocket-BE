const router = require("express").Router();
//controllers
const authorController = require("../controllers/author.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//Add author
router.post(
  "/admin/add",
  verifyToken,
  upload.single("authorPic"),
  payloadValidator.validateAddAuthor,
  authorController.addAuthor
);

//Get all authors
router.get("/admin/all", verifyToken, authorController.getAllAuthors);

//Follow the author
router.post("/app/follow/:id", verifyToken, authorController.followAuthor);

module.exports = router;
