const router = require("express").Router();
//controllers
const authorController = require("../controllers/author.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Add author
router.post(
  "/admin/add",
  verifyToken,
  verifyRole(["Admin"]),
  upload.single("authorPic"),
  payloadValidator.validateAddAuthor,
  authorController.addAuthor
);

//[ADMIN] Get all authors
router.get(
  "/admin/all",
  verifyToken,
  verifyRole(["Admin"]),
  authorController.getAllAuthors
);

//[APP] Follow the author
router.post(
  "/app/follow/:id",
  verifyToken,
  authorController.followAuthor
);

module.exports = router;
