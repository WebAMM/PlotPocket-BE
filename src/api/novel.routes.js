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

//Add novel
router.post("/add", verifyToken, addNovel);

//Edit novel
router.put("/edit/:id", verifyToken, editNovel);

//Delete novel
router.delete("/delete/:id", verifyToken, deleteNovel);

//Get all novels
router.get("/all", verifyToken, getAllNovels);

//Add chapters to novel
router.post("/add-chapter/:id", verifyToken, addChapter);

//Get chapters based on novel
router.get("/get-chapters", verifyToken, getAllChaptersByNovel);

module.exports = router;
