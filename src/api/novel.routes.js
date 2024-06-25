const router = require("express").Router();
//controllers
const {
  addNovel,
  getAllNovels,
  editNovel,
  deleteNovel,
} = require("../controllers/novel.controller");
const {
  addChapter,
  getAllChaptersByNovel,
} = require("../controllers/chapter.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//Add novel
router.post(
  "/admin/add",
  verifyToken,
  upload.single("thumbnail"),
  payloadValidator.validateAddNovel,
  addNovel
);

//Add chapters to novel
router.post(
  "/admin/add-chapter/:id",
  verifyToken,
  upload.single("chapter"),
  payloadValidator.validateAddChapter,
  addChapter
);

//Edit novel
router.put("/admin/edit/:id", verifyToken, editNovel);

//Delete novel
router.delete("/admin/delete/:id", verifyToken, deleteNovel);

//Get novels
router.get("/admin/all", verifyToken, getAllNovels);

//Get chapters based on novel
router.get("/admin/get-chapters", verifyToken, getAllChaptersByNovel);

module.exports = router;
