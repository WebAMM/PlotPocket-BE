const router = require("express").Router();
//controllers
const {
  addCategory,
  getAllCategories,
  getCategoriesByType,
  editCategory,
  deleteCategory,
  changeCategoryStatus,
} = require("../controllers/category.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");

//Add category
router.post("/add", verifyToken, addCategory);

//Get all the categories
router.get("/all", verifyToken, getAllCategories);

//Get category by type
router.get("/by-type", verifyToken, getCategoriesByType);

//Edit the category
router.put("/edit/:id", verifyToken, editCategory);

//Delete the category
router.delete("/delete/:id", verifyToken, deleteCategory);

//Change category status
router.patch("/change-status/:id", verifyToken, changeCategoryStatus);

module.exports = router;
