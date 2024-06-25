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

//Add novel
router.post("/admin/add", verifyToken, upload.single("thumbnail"), addNovel);

//Edit novel
router.put("/admin/edit/:id", verifyToken, editNovel);

//Delete novel
router.delete("/admin/delete/:id", verifyToken, deleteNovel);

//Get novels
router.get("/admin/all", verifyToken, getAllNovels);

//Add chapters to novel
router.post(
  "admin/add-chapter/:id",
  upload.single("chapter"),
  verifyToken,
  addChapter
);

//Get chapters based on novel
router.get("/admin/get-chapters", verifyToken, getAllChaptersByNovel);

module.exports = router;
